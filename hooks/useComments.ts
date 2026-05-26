'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Comment {
  id: string
  document_id: string
  author_id: string
  content: string
  resolved: boolean
  selection_from: number | null
  selection_to: number | null
  created_at: string
  author: { full_name: string | null; email: string | null; avatar_url: string | null } | null
  replies: Reply[]
}

export interface Reply {
  id: string
  comment_id: string
  author_id: string
  content: string
  created_at: string
  author: { full_name: string | null; email: string | null; avatar_url: string | null } | null
}

export function useComments(documentId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    const res = await window.fetch(`/api/comments?documentId=${documentId}`)
    if (res.ok) setComments(await res.json())
    setLoading(false)
  }, [documentId])

  useEffect(() => { fetchComments() }, [fetchComments])

  async function addComment(content: string, authorId: string, from: number, to: number) {
    const res = await window.fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, content, selectionFrom: from, selectionTo: to }),
    })
    const data = await res.json()
    if (res.ok) {
      setComments(c => [...c, { ...data, replies: [] } as Comment])
    }
    return { data: res.ok ? data : null, error: res.ok ? null : new Error(data.error) }
  }

  async function addReply(commentId: string, content: string, authorId: string) {
    const res = await window.fetch('/api/comments/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, content }),
    })
    const data = await res.json()
    if (res.ok) {
      setComments(c => c.map(cm =>
        cm.id === commentId ? { ...cm, replies: [...cm.replies, data as Reply] } : cm
      ))
    }
    return { error: res.ok ? null : new Error(data.error) }
  }

  async function resolveComment(commentId: string) {
    const res = await window.fetch(`/api/comments?id=${commentId}`, { method: 'PATCH' })
    if (res.ok) {
      setComments(c => c.filter(cm => cm.id !== commentId))
    }
    return { error: res.ok ? null : new Error('Failed') }
  }

  return { comments, loading, addComment, addReply, resolveComment, refetch: fetchComments }
}
