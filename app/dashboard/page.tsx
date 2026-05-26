import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Use adminClient to bypass circular RLS + FK hints to disambiguate the two profiles FKs on document_collaborators
  const { data: ownedDocs } = await adminClient
    .from('documents')
    .select('*, owner:profiles!documents_owner_id_fkey(full_name, email, avatar_url), collaborators:document_collaborators(profiles!document_collaborators_user_id_fkey(full_name, avatar_url))')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const { data: collabRows } = await adminClient
    .from('document_collaborators')
    .select('document:documents(*, owner:profiles!documents_owner_id_fkey(full_name, email, avatar_url), collaborators:document_collaborators(profiles!document_collaborators_user_id_fkey(full_name, avatar_url)))')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)

  const collaboratedDocs = (collabRows ?? [])
    .map((c: any) => c.document)
    .filter(Boolean)

  const allDocs = [
    ...(ownedDocs ?? []).map((d: any) => ({ ...d, isOwner: true })),
    ...collaboratedDocs.map((d: any) => ({ ...d, isOwner: false })),
  ]

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <DashboardClient initialDocs={allDocs} user={user} profile={profile} />
}
