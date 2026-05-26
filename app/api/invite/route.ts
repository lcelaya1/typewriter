import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { sendInviteEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { documentId, email, role, invitedBy } = await request.json()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: doc } = await adminClient.from('documents').select('title').eq('id', documentId).single()
    const { data: inviterProfile } = await adminClient.from('profiles').select('full_name, email').eq('id', invitedBy).single()

    const { data: invite, error } = await adminClient
      .from('document_invites')
      .insert({ document_id: documentId, email, role, invited_by: invitedBy })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${(invite as any).token}`
    const inviterName = (inviterProfile as any)?.full_name || (inviterProfile as any)?.email || 'Someone'

    await sendInviteEmail({
      to: email,
      inviterName,
      documentTitle: (doc as any)?.title || 'Untitled',
      inviteUrl,
      role,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
