'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { CommentExtension } from '@/lib/tiptap/extensions/CommentExtension'
import { TrackChanges, TrackInsert, TrackDelete } from '@/lib/tiptap/extensions/TrackChanges'
import { CustomFontFamily } from '@/lib/tiptap/extensions/CustomFontFamily'
import { Toolbar } from './Toolbar'
import { CommentSidebar } from './CommentSidebar'
import { TrackChangesBar } from './TrackChangesBar'
import { TocPanel } from './TocPanel'
import { useComments } from '@/hooks/useComments'
import { MessageSquarePlus } from 'lucide-react'

interface EditorProps {
  documentId: string
  initialContent: object | null
  onContentChange: (content: object) => void
  editable?: boolean
  userId: string
  userName: string
}

export default function Editor({ documentId, initialContent, onContentChange, editable = true, userId, userName }: EditorProps) {
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false)
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [pendingComment, setPendingComment] = useState<{ from: number; to: number } | null>(null)
  const [selectionPos, setSelectionPos] = useState<{ top: number; left: number } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { comments, addComment, addReply, resolveComment } = useComments(documentId)

  // If the document was imported from .docx, it has { _importedHtml: "..." }
  // We pass the HTML string directly so Tiptap parses it in the browser.
  const isImport = initialContent && (initialContent as { _importedHtml?: string })._importedHtml
  const contentProp: string | object = isImport
    ? (initialContent as { _importedHtml: string })._importedHtml
    : (initialContent || '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      TextStyle,
      CustomFontFamily.configure({ types: ['textStyle'] }),
      CommentExtension,
      TrackInsert,
      TrackDelete,
      TrackChanges,
    ],
    content: contentProp,
    editable,
    // After the editor is ready, if content came from an import, save it
    // immediately as Tiptap JSON so we don't re-parse HTML on every reload.
    onCreate: ({ editor: e }) => {
      if (isImport) {
        setTimeout(() => onContentChange(e.getJSON()), 200)
      }
    },
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getJSON())
    },
    onSelectionUpdate: ({ editor: e }) => {
      const { from, to } = e.state.selection
      if (from !== to) {
        const domSelection = window.getSelection()
        if (domSelection && domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (containerRect) {
            setSelectionPos({
              top: rect.top - containerRect.top - 44,
              left: rect.left - containerRect.left + rect.width / 2,
            })
          }
        }
        setHasSelection(true)
      } else {
        setHasSelection(false)
        setSelectionPos(null)
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[calc(100vh-200px)] px-16 py-12',
      },
    },
  })

  useEffect(() => {
    if (editor) {
      editor.commands.setTrackChangesEnabled(trackChangesEnabled)
      ;(editor.storage as any).trackChanges.currentUser = { id: userId, name: userName }
    }
  }, [editor, trackChangesEnabled, userId, userName])

  const hasTrackedChanges = useCallback(() => {
    if (!editor) return false
    let found = false
    editor.state.doc.descendants(node => {
      if (found) return false
      node.marks.forEach(mark => {
        if (mark.type.name === 'trackInsert' || mark.type.name === 'trackDelete') found = true
      })
    })
    return found
  }, [editor])

  function handleAddComment() {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    setPendingComment({ from, to })
    setCommentSidebarOpen(true)
    setHasSelection(false)
  }

  async function handleSubmitComment(content: string) {
    if (!editor || !pendingComment) return
    const { data } = await addComment(content, userId, pendingComment.from, pendingComment.to)
    if (data && (data as any).id) {
      editor.commands.setComment((data as any).id)
      setActiveCommentId((data as any).id)
    }
    setPendingComment(null)
  }

  function handleCommentClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    const commentMark = target.closest('[data-comment-id]')
    if (commentMark) {
      const id = commentMark.getAttribute('data-comment-id')
      setActiveCommentId(id)
      setCommentSidebarOpen(true)
    }
  }

  async function handleResolveComment(commentId: string) {
    await resolveComment(commentId)
    editor?.commands.unsetComment(commentId)
    if (activeCommentId === commentId) setActiveCommentId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {editor && (
        <Toolbar
          editor={editor}
          documentId={documentId}
          trackChangesEnabled={trackChangesEnabled}
          onToggleTrackChanges={() => setTrackChangesEnabled(v => !v)}
          onAddComment={handleAddComment}
          hasSelection={hasSelection}
          tocOpen={tocOpen}
          onToggleToc={() => setTocOpen(v => !v)}
        />
      )}

      {editor && hasTrackedChanges() && (
        <TrackChangesBar
          onAcceptAll={() => editor.commands.acceptAllChanges()}
          onRejectAll={() => editor.commands.rejectAllChanges()}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Table of Contents panel */}
        {tocOpen && editor && <TocPanel editor={editor} />}

        {/* Document canvas */}
        <div className="flex-1 overflow-auto bg-[#FAFAFA]">
          <div className="max-w-[720px] mx-auto my-8">
            <div
              ref={containerRef}
              className="relative bg-white shadow-sm border border-[#E5E5E5] rounded-sm min-h-[calc(100vh-180px)]"
              onClick={handleCommentClick}
            >
              {/* Floating comment button on selection */}
              {hasSelection && selectionPos && editable && (
                <div
                  className="absolute z-20 pointer-events-auto"
                  style={{
                    top: selectionPos.top,
                    left: selectionPos.left,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <button
                    onMouseDown={e => { e.preventDefault(); handleAddComment() }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#111111] bg-white border border-[#E5E5E5] rounded-md shadow-md hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
                  >
                    <MessageSquarePlus size={13} />
                    Comment
                  </button>
                </div>
              )}
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Comments sidebar */}
        {commentSidebarOpen && (
          <CommentSidebar
            comments={comments}
            activeCommentId={activeCommentId}
            pendingComment={pendingComment}
            onSubmitComment={handleSubmitComment}
            onReply={addReply}
            onResolve={handleResolveComment}
            onClose={() => { setCommentSidebarOpen(false); setPendingComment(null) }}
            onSelectComment={setActiveCommentId}
            currentUserId={userId}
          />
        )}
      </div>
    </div>
  )
}
