import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// GET /api/comments?documentId=xxx
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  // Verify user has access to this document
  const { data: doc } = await adminClient.from('documents').select('owner_id').eq('id', documentId).single()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = (doc as any).owner_id === user.id
  if (!isOwner) {
    const { data: collab } = await adminClient
      .from('document_collaborators')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .single()
    if (!collab) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await adminClient
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(full_name, email, avatar_url), replies:comment_replies(*, author:profiles!comment_replies_author_id_fkey(full_name, email, avatar_url))')
    .eq('document_id', documentId)
    .eq('resolved', false)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

// POST /api/comments — add a comment
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId, content, selectionFrom, selectionTo } = await request.json()

  // Verify access
  const { data: doc } = await adminClient.from('documents').select('owner_id').eq('id', documentId).single()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = (doc as any).owner_id === user.id
  if (!isOwner) {
    const { data: collab } = await adminClient
      .from('document_collaborators')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .single()
    if (!collab) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await adminClient
    .from('comments')
    .insert({ document_id: documentId, author_id: user.id, content, selection_from: selectionFrom, selection_to: selectionTo })
    .select('*, author:profiles!comments_author_id_fkey(full_name, email, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PATCH /api/comments?id=xxx — resolve a comment
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const { error } = await adminClient.from('comments').update({ resolved: true }).eq('id', id!)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
