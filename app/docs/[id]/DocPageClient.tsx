'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Share2, ArrowLeft } from 'lucide-react'
import { useDocument } from '@/hooks/useDocument'
import { usePresence } from '@/hooks/usePresence'
import { CollaboratorAvatars } from '@/components/editor/CollaboratorAvatars'
import { ShareModal } from '@/components/sharing/ShareModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

const Editor = dynamic(() => import('@/components/editor/Editor'), { ssr: false })

type Doc = Database['public']['Tables']['documents']['Row']

interface DocPageClientProps {
  doc: Doc
  userId: string
  userName: string
  isOwner: boolean
  editable: boolean
}

export default function DocPageClient({ doc, userId, userName, isOwner, editable }: DocPageClientProps) {
  const { document, saveStatus, saveContent, saveTitle } = useDocument(doc.id)
  const { users } = usePresence(doc.id, { id: userId, name: userName, email: '' })
  const [title, setTitle] = useState(doc.title)
  const [shareOpen, setShareOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document?.title && document.title !== title) {
      setTitle(document.title)
    }
  }, [document?.title])

  function handleTitleBlur() {
    if (title !== doc.title) saveTitle(title)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') titleRef.current?.blur()
  }

  const saveLabel = {
    saving: 'Saving…',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
  }[saveStatus]

  return (
    <>
      {/* Top bar */}
      <header className="bg-white border-b border-[#E5E5E5] px-4 py-2.5 flex items-center gap-3 shrink-0 z-10">
        <Link href="/dashboard" className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111] transition-colors">
          <ArrowLeft size={16} />
        </Link>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base font-semibold tracking-tight text-[#111111] select-none">T</span>
          {editable ? (
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="flex-1 min-w-0 text-sm font-medium text-[#111111] bg-transparent border-none outline-none focus:bg-[#F5F5F5] px-2 py-1 rounded transition-colors truncate"
            />
          ) : (
            <span className="text-sm font-medium text-[#111111] truncate px-2">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <CollaboratorAvatars users={users} currentUserId={userId} />

          <span className={cn(
            'text-xs transition-colors',
            saveStatus === 'saving' && 'text-[#AAAAAA]',
            saveStatus === 'saved' && 'text-[#22C55E]',
            saveStatus === 'unsaved' && 'text-[#F59E0B]',
          )}>
            {saveLabel}
          </span>

          {isOwner && (
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Share2 size={13} />
              Share
            </Button>
          )}
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          documentId={doc.id}
          initialContent={doc.content as object | null}
          onContentChange={saveContent}
          editable={editable}
          userId={userId}
          userName={userName}
        />
      </div>

      {shareOpen && (
        <ShareModal
          documentId={doc.id}
          currentUserId={userId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  )
}
