import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import DocPageClient from './DocPageClient'

export default async function DocPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirectTo=/docs/${params.id}`)

  // Use admin client to bypass circular RLS
  const { data: doc } = await adminClient
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!doc) notFound()

  const isOwner = (doc as any).owner_id === user.id
  let editable = isOwner

  if (!isOwner) {
    const { data: collab } = await adminClient
      .from('document_collaborators')
      .select('role')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .single()

    if (!collab) redirect('/dashboard')
    editable = (collab as any).role === 'editor'
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <DocPageClient
      doc={doc as any}
      userId={user.id}
      userName={(profile as any)?.full_name || (profile as any)?.email || user.email || 'Unknown'}
      isOwner={isOwner}
      editable={editable}
    />
  )
}
