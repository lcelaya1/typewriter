import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// POST /api/comments/replies — add a reply
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { commentId, content } = await request.json()

  const { data, error } = await adminClient
    .from('comment_replies')
    .insert({ comment_id: commentId, author_id: user.id, content })
    .select('*, author:profiles!comment_replies_author_id_fkey(full_name, email, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
