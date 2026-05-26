'use client'

import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown, Type } from 'lucide-react'
import { useFonts } from '@/hooks/useFonts'
import { injectFontFace } from '@/lib/tiptap/extensions/CustomFontFamily'
import { cn } from '@/lib/utils'

const BUILTIN_FONTS = [
  { label: 'Default', family: '' },
  { label: 'Serif', family: 'Georgia, serif' },
  { label: 'Monospace', family: 'monospace' },
  { label: 'Sans-serif', family: 'Arial, sans-serif' },
]

interface FontPickerProps {
  editor: Editor
}

export function FontPicker({ editor }: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { fonts } = useFonts()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Inject @font-face for all user fonts
  useEffect(() => {
    fonts.forEach(font => injectFontFace(font.family, font.file_url, font.format))
  }, [fonts])

  const currentFont = editor.getAttributes('textStyle').fontFamily || ''
  const currentLabel = BUILTIN_FONTS.find(f => f.family === currentFont)?.label
    || fonts.find(f => f.family === currentFont)?.name
    || 'Default'

  function applyFont(family: string, fontEntry?: { url: string; format: string }) {
    if (family === '') {
      editor.chain().focus().unsetFontFamily().run()
    } else if (fontEntry) {
      editor.chain().focus().setCustomFont(family, { family, url: fontEntry.url, format: fontEntry.format }).run()
    } else {
      editor.chain().focus().setFontFamily(family).run()
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111] rounded transition-colors min-w-[90px]"
      >
        <Type size={13} />
        <span className="truncate max-w-[70px]">{currentLabel}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E5E5E5] rounded-md shadow-sm py-1 min-w-[160px]">
          <div className="px-2 py-1 text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider">Built-in</div>
          {BUILTIN_FONTS.map(font => (
            <button
              key={font.label}
              onMouseDown={e => { e.preventDefault(); applyFont(font.family) }}
              className={cn(
                'w-full flex items-center px-3 py-1.5 text-sm hover:bg-[#F5F5F5] text-left transition-colors',
                currentFont === font.family && 'bg-[#F5F5F5] font-medium text-[#111111]'
              )}
              style={{ fontFamily: font.family || undefined }}
            >
              {font.label}
            </button>
          ))}

          {fonts.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider mt-1 border-t border-[#E5E5E5] pt-2">Your fonts</div>
              {fonts.map(font => (
                <button
                  key={font.id}
                  onMouseDown={e => { e.preventDefault(); applyFont(font.family, { url: font.file_url, format: font.format }) }}
                  className={cn(
                    'w-full flex items-center px-3 py-1.5 text-sm hover:bg-[#F5F5F5] text-left transition-colors',
                    currentFont === font.family && 'bg-[#F5F5F5] font-medium text-[#111111]'
                  )}
                  style={{ fontFamily: `'${font.family}'` }}
                >
                  {font.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
