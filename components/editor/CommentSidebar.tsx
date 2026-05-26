'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { X, CheckCircle, MessageSquare, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import type { Comment } from '@/hooks/useComments'
import { cn } from '@/lib/utils'

interface CommentSidebarProps {
  comments: Comment[]
  activeCommentId: string | null
  pendingComment: { from: number; to: number } | null
  onSubmitComment: (content: string) => Promise<void>
  onReply: (commentId: string, content: string, authorId: string) => Promise<{ error: unknown }>
  onResolve: (commentId: string) => Promise<void>
  onClose: () => void
  onSelectComment: (id: string | null) => void
  currentUserId: string
}

function CommentItem({ comment, active, onSelect, onResolve, onReply, currentUserId }: {
  comment: Comment
  active: boolean
  onSelect: () => void
  onResolve: () => void
  onReply: (content: string) => void
  currentUserId: string
}) {
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    onReply(replyText)
    setReplyText('')
    setShowReply(false)
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-3 cursor-pointer transition-all',
        active ? 'border-[#111111] shadow-sm' : 'border-[#E5E5E5] hover:border-[#AAAAAA]'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <Avatar
          name={comment.author?.full_name || comment.author?.email || '?'}
          src={comment.author?.avatar_url}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-[#111111] truncate">
              {comment.author?.full_name || comment.author?.email || 'Unknown'}
            </span>
            <span className="text-[10px] text-[#AAAAAA] shrink-0">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-[#111111] mt-1 leading-relaxed">{comment.content}</p>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-3 pl-7 space-y-2.5 border-l border-[#E5E5E5] ml-4">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-2">
              <Avatar name={reply.author?.full_name || '?'} src={reply.author?.avatar_url} size="sm" />
              <div>
                <span className="text-xs font-medium text-[#111111]">{reply.author?.full_name || 'Unknown'}</span>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <div className="mt-3 flex items-center gap-2 pl-0">
          <button
            onClick={e => { e.stopPropagation(); setShowReply(v => !v) }}
            className="text-xs text-[#6B6B6B] hover:text-[#111111] transition-colors"
          >
            Reply
          </button>
          <button
            onClick={e => { e.stopPropagation(); onResolve() }}
            className="text-xs text-[#6B6B6B] hover:text-[#22C55E] transition-colors flex items-center gap-1"
          >
            <CheckCircle size={11} />
            Resolve
          </button>
        </div>
      )}

      {showReply && active && (
        <form onSubmit={handleReply} className="mt-2" onClick={e => e.stopPropagation()}>
          <textarea
            autoFocus
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="w-full text-xs border border-[#E5E5E5] rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#111111] placeholder:text-[#AAAAAA]"
          />
          <div className="flex gap-1.5 mt-1.5">
            <Button type="submit" size="sm" disabled={!replyText.trim()}>Post</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReply(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  )
}

export function CommentSidebar({
  comments, activeCommentId, pendingComment, onSubmitComment,
  onReply, onResolve, onClose, onSelectComment, currentUserId
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  const activeComments = comments.filter(c => !c.resolved)
  const resolvedComments = comments.filter(c => c.resolved)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)
    await onSubmitComment(newComment)
    setNewComment('')
    setSubmitting(false)
  }

  return (
    <div className="w-72 bg-white border-l border-[#E5E5E5] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-1.5">
          <MessageSquare size={14} className="text-[#6B6B6B]" />
          <span className="text-sm font-medium text-[#111111]">Comments</span>
          {activeComments.length > 0 && (
            <span className="bg-[#F5F5F5] text-[#6B6B6B] text-[10px] font-medium px-1.5 py-0.5 rounded-full">{activeComments.length}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#AAAAAA] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {pendingComment && (
          <div className="border border-dashed border-[#111111] rounded-lg p-3">
            <p className="text-xs font-medium text-[#111111] mb-2">New comment</p>
            <form onSubmit={handleSubmit}>
              <textarea
                autoFocus
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="w-full text-sm border border-[#E5E5E5] rounded px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#111111] placeholder:text-[#AAAAAA]"
              />
              <div className="flex gap-1.5 mt-2">
                <Button type="submit" size="sm" disabled={!newComment.trim() || submitting}>
                  {submitting ? 'Posting…' : 'Post'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {activeComments.length === 0 && !pendingComment && (
          <p className="text-xs text-[#AAAAAA] text-center py-8">No comments yet. Select text to add a comment.</p>
        )}

        {activeComments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            active={activeCommentId === comment.id}
            onSelect={() => onSelectComment(comment.id)}
            onResolve={() => onResolve(comment.id)}
            onReply={text => onReply(comment.id, text, currentUserId)}
            currentUserId={currentUserId}
          />
        ))}

        {resolvedComments.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowResolved(v => !v)}
              className="flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-[#111111] w-full py-1"
            >
              <ChevronDown size={12} className={cn('transition-transform', showResolved && 'rotate-180')} />
              {resolvedComments.length} resolved
            </button>
            {showResolved && resolvedComments.map(comment => (
              <div key={comment.id} className="opacity-50">
                <CommentItem
                  comment={comment}
                  active={false}
                  onSelect={() => {}}
                  onResolve={() => {}}
                  onReply={() => {}}
                  currentUserId={currentUserId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
