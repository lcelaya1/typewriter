'use client'

import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo,
  Heading1, Heading2, Heading3, Highlighter, GitBranch,
  Table, Image as ImageIcon, MessageSquarePlus, BookOpen
} from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { FontPicker } from './FontPicker'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  editor: Editor
  documentId: string
  trackChangesEnabled: boolean
  onToggleTrackChanges: () => void
  onAddComment: () => void
  hasSelection: boolean
  tocOpen: boolean
  onToggleToc: () => void
}

function ToolBtn({ onClick, active, disabled, title, children }: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Tooltip content={title}>
      <button
        onMouseDown={e => { e.preventDefault(); onClick() }}
        disabled={disabled}
        className={cn(
          'p-1.5 rounded transition-colors',
          active ? 'bg-[#111111] text-white' : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111]',
          disabled && 'opacity-30 pointer-events-none'
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-[#E5E5E5] mx-0.5" />
}

export function Toolbar({ editor, trackChangesEnabled, onToggleTrackChanges, onAddComment, hasSelection, tocOpen, onToggleToc }: ToolbarProps) {
  function addTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  async function addImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  return (
    <div className="bg-white border-b border-[#E5E5E5] px-4 py-1.5 flex items-center gap-0.5 overflow-x-auto shrink-0">
      <Tooltip content="Table of contents">
        <button
          onMouseDown={e => { e.preventDefault(); onToggleToc() }}
          className={cn(
            'p-1.5 rounded transition-colors',
            tocOpen ? 'bg-[#111111] text-white' : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111]'
          )}
        >
          <BookOpen size={15} />
        </button>
      </Tooltip>

      <Sep />

      <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
        <Undo size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
        <Redo size={15} />
      </ToolBtn>

      <Sep />

      <FontPicker editor={editor} />

      <Sep />

      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 size={15} />
      </ToolBtn>

      <Sep />

      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <Bold size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <Italic size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
        <Underline size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
        <Highlighter size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
        <Code size={15} />
      </ToolBtn>

      <Sep />

      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
        <AlignLeft size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
        <AlignCenter size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
        <AlignRight size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
        <AlignJustify size={15} />
      </ToolBtn>

      <Sep />

      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        <List size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
        <ListOrdered size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
        <Quote size={15} />
      </ToolBtn>

      <Sep />

      <ToolBtn onClick={addTable} title="Insert table">
        <Table size={15} />
      </ToolBtn>
      <ToolBtn onClick={addImage} title="Insert image">
        <ImageIcon size={15} />
      </ToolBtn>

      <Sep />

      <Tooltip content="Track changes">
        <button
          onMouseDown={e => { e.preventDefault(); onToggleTrackChanges() }}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors font-medium',
            trackChangesEnabled
              ? 'bg-[#111111] text-white'
              : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111]'
          )}
        >
          <GitBranch size={13} />
          Track
        </button>
      </Tooltip>

      {hasSelection && (
        <>
          <Sep />
          <Tooltip content="Add comment">
            <button
              onMouseDown={e => { e.preventDefault(); onAddComment() }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors font-medium text-[#F59E0B] hover:bg-amber-50"
            >
              <MessageSquarePlus size={13} />
              Comment
            </button>
          </Tooltip>
        </>
      )}
    </div>
  )
}
