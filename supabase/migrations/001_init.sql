-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  content jsonb,
  owner_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document collaborators
create table if not exists document_collaborators (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('viewer', 'editor')),
  invited_by uuid references profiles(id),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique(document_id, user_id)
);

-- Pending invites
create table if not exists document_invites (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  email text not null,
  role text check (role in ('viewer', 'editor')),
  token text unique default gen_random_uuid()::text,
  invited_by uuid references profiles(id),
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days'
);

-- Comments
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  author_id uuid references profiles(id),
  content text not null,
  resolved boolean default false,
  selection_from int,
  selection_to int,
  created_at timestamptz default now()
);

-- Comment replies
create table if not exists comment_replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references comments(id) on delete cascade,
  author_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- Font library
create table if not exists fonts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  family text not null,
  file_url text not null,
  file_path text not null,
  format text check (format in ('woff2', 'woff', 'ttf', 'otf')),
  created_at timestamptz default now()
);

-- Updated_at trigger for documents
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute procedure update_updated_at_column();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS Policies
alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_collaborators enable row level security;
alter table document_invites enable row level security;
alter table comments enable row level security;
alter table comment_replies enable row level security;
alter table fonts enable row level security;

-- Profiles: users can read all profiles, only update their own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Documents: owner or collaborator can read
create policy "documents_read" on documents for select using (
  auth.uid() = owner_id or
  exists (
    select 1 from document_collaborators
    where document_id = documents.id
    and user_id = auth.uid()
    and accepted_at is not null
  )
);
create policy "documents_insert" on documents for insert with check (auth.uid() = owner_id);
create policy "documents_update" on documents for update using (
  auth.uid() = owner_id or
  exists (
    select 1 from document_collaborators
    where document_id = documents.id
    and user_id = auth.uid()
    and role = 'editor'
    and accepted_at is not null
  )
);
create policy "documents_delete" on documents for delete using (auth.uid() = owner_id);

-- Document collaborators
create policy "collaborators_read" on document_collaborators for select using (
  auth.uid() = user_id or
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);
create policy "collaborators_insert" on document_collaborators for insert with check (
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);
create policy "collaborators_update" on document_collaborators for update using (
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);
create policy "collaborators_delete" on document_collaborators for delete using (
  auth.uid() = user_id or
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);

-- Document invites
create policy "invites_read" on document_invites for select using (
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);
create policy "invites_insert" on document_invites for insert with check (
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);
create policy "invites_delete" on document_invites for delete using (
  exists (select 1 from documents where id = document_id and owner_id = auth.uid())
);
-- Allow anyone to read invite by token (for accept flow)
create policy "invites_read_by_token" on document_invites for select using (true);

-- Comments
create policy "comments_read" on comments for select using (
  exists (
    select 1 from documents d
    left join document_collaborators dc on dc.document_id = d.id and dc.user_id = auth.uid()
    where d.id = document_id
    and (d.owner_id = auth.uid() or (dc.user_id = auth.uid() and dc.accepted_at is not null))
  )
);
create policy "comments_insert" on comments for insert with check (
  auth.uid() = author_id and
  exists (
    select 1 from documents d
    left join document_collaborators dc on dc.document_id = d.id and dc.user_id = auth.uid()
    where d.id = document_id
    and (d.owner_id = auth.uid() or (dc.user_id = auth.uid() and dc.accepted_at is not null))
  )
);
create policy "comments_update" on comments for update using (
  exists (
    select 1 from documents d
    left join document_collaborators dc on dc.document_id = d.id and dc.user_id = auth.uid()
    where d.id = document_id
    and (d.owner_id = auth.uid() or (dc.user_id = auth.uid() and dc.role = 'editor' and dc.accepted_at is not null))
  )
);

-- Comment replies
create policy "replies_read" on comment_replies for select using (
  exists (
    select 1 from comments c
    join documents d on d.id = c.document_id
    left join document_collaborators dc on dc.document_id = d.id and dc.user_id = auth.uid()
    where c.id = comment_id
    and (d.owner_id = auth.uid() or (dc.user_id = auth.uid() and dc.accepted_at is not null))
  )
);
create policy "replies_insert" on comment_replies for insert with check (auth.uid() = author_id);

-- Fonts: users manage their own
create policy "fonts_read" on fonts for select using (auth.uid() = owner_id);
create policy "fonts_insert" on fonts for insert with check (auth.uid() = owner_id);
create policy "fonts_delete" on fonts for delete using (auth.uid() = owner_id);

-- Storage buckets (run these in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('fonts', 'fonts', true);
-- insert into storage.buckets (id, name, public) values ('images', 'images', true);
