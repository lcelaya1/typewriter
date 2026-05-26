import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// GET /api/documents/[id]
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await adminClient.from('documents').select('*').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify access
  const isOwner = (doc as any).owner_id === user.id
  if (!isOwner) {
    const { data: collab } = await adminClient
      .from('document_collaborators')
      .select('role')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .single()
    if (!collab) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(doc)
}

// PATCH /api/documents/[id] — update title or content
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership or editor role
  const { data: doc } = await adminClient.from('documents').select('owner_id').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = (doc as any).owner_id === user.id
  if (!isOwner) {
    const { data: collab } = await adminClient
      .from('document_collaborators')
      .select('role')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .single()
    if (!collab || (collab as any).role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await request.json()
  const { data, error } = await adminClient
    .from('documents')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE /api/documents/[id]
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await adminClient.from('documents').select('owner_id').eq('id', params.id).single()
  if (!doc || (doc as any).owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await adminClient.from('documents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
