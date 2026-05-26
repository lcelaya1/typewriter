'use client'

import { Trash2 } from 'lucide-react'
import { injectFontFace } from '@/lib/tiptap/extensions/CustomFontFamily'
import type { Database } from '@/lib/supabase/types'

type Font = Database['public']['Tables']['fonts']['Row']

interface FontListProps {
  fonts: Font[]
  onDelete: (id: string) => void
}

export function FontList({ fonts, onDelete }: FontListProps) {
  if (fonts.length === 0) {
    return (
      <p className="text-sm text-[#AAAAAA] text-center py-8">
        No fonts uploaded yet. Add a font above to use it in your documents.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {fonts.map(font => {
        injectFontFace(font.family, font.file_url, font.format)
        return (
          <div key={font.id} className="group bg-white border border-[#E5E5E5] rounded-lg p-4 hover:border-[#AAAAAA] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-[#111111]">{font.name}</p>
                <p className="text-xs text-[#AAAAAA] mt-0.5 uppercase">{font.format}</p>
              </div>
              <button
                onClick={() => onDelete(font.id)}
                className="p-1 rounded text-[#AAAAAA] hover:text-[#EF4444] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <p
              style={{ fontFamily: `'${font.family}'` }}
              className="text-2xl text-[#111111]"
            >
              Aa
            </p>
            <p
              style={{ fontFamily: `'${font.family}'` }}
              className="text-xs text-[#6B6B6B] mt-1"
            >
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
        )
      })}
    </div>
  )
}
