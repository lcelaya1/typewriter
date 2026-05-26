import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/auth/signup?token=${params.token}`)

  const { data: invite } = await adminClient
    .from('document_invites')
    .select('*')
    .eq('token', params.token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#111111]">Invalid invite</h1>
          <p className="text-sm text-[#6B6B6B] mt-1">This invite link is invalid or has expired.</p>
          <a href="/dashboard" className="text-sm text-[#111111] font-medium hover:underline mt-4 block">Go to dashboard</a>
        </div>
      </div>
    )
  }

  if (new Date((invite as any).expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#111111]">Invite expired</h1>
          <p className="text-sm text-[#6B6B6B] mt-1">Ask the owner to send a new invite.</p>
          <a href="/dashboard" className="text-sm text-[#111111] font-medium hover:underline mt-4 block">Go to dashboard</a>
        </div>
      </div>
    )
  }

  await adminClient.from('document_collaborators').upsert({
    document_id: (invite as any).document_id,
    user_id: user.id,
    role: (invite as any).role,
    invited_by: (invite as any).invited_by,
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'document_id,user_id' })

  await adminClient.from('profiles').update({ email: user.email }).eq('id', user.id)
  await adminClient.from('document_invites').delete().eq('token', params.token)

  redirect(`/docs/${(invite as any).document_id}`)
}
