'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { AlignLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TocItem {
  level: number
  text: string
  pos: number
}

interface TocPanelProps {
  editor: Editor
}

function extractHeadings(editor: Editor): TocItem[] {
  const items: TocItem[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      items.push({
        level: node.attrs.level as number,
        text: node.textContent.trim(),
        pos,
      })
    }
  })
  return items
}

function scrollToHeading(editor: Editor, pos: number) {
  try {
    const domInfo = editor.view.domAtPos(pos + 1)
    let el: Element | null =
      domInfo.node instanceof Element ? domInfo.node : (domInfo.node as Node).parentElement
    // Walk up to find the heading element itself
    while (el && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
      el = el.parentElement
    }
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch {
    // ignore stale positions
  }
}

export function TocPanel({ editor }: TocPanelProps) {
  const [items, setItems] = useState<TocItem[]>(() => extractHeadings(editor))

  useEffect(() => {
    function refresh() {
      setItems(extractHeadings(editor))
    }
    editor.on('update', refresh)
    editor.on('selectionUpdate', refresh)
    return () => {
      editor.off('update', refresh)
      editor.off('selectionUpdate', refresh)
    }
  }, [editor])

  // Determine the minimum heading level present (to normalise indentation)
  const minLevel = items.length ? Math.min(...items.map(i => i.level)) : 1

  return (
    <div className="w-52 border-r border-[#E5E5E5] bg-white flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E5E5E5] shrink-0">
        <AlignLeft size={13} className="text-[#AAAAAA] shrink-0" />
        <span className="text-xs font-medium text-[#111111] flex-1">Contents</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-[#AAAAAA] px-3 py-3 leading-relaxed">
            Add headings to your document to see them here.
          </p>
        ) : (
          items.map((item, idx) => {
            const indent = (item.level - minLevel) * 12
            return (
              <button
                key={idx}
                onClick={() => scrollToHeading(editor, item.pos)}
                style={{ paddingLeft: `${indent + 12}px` }}
                className={cn(
                  'w-full text-left py-1 pr-3 text-xs transition-colors truncate leading-snug',
                  item.level === 1
                    ? 'font-medium text-[#111111] hover:bg-[#F5F5F5]'
                    : 'text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111]'
                )}
                title={item.text}
              >
                {item.text || <span className="italic text-[#AAAAAA]">(empty heading)</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
