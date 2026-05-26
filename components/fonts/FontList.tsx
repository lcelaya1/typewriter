'use client'

import { useState } from 'react'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { injectFontFace } from '@/lib/tiptap/extensions/CustomFontFamily'
import type { Database } from '@/lib/supabase/types'

type Font = Database['public']['Tables']['fonts']['Row']

interface FontListProps {
  fonts: Font[]
  onDelete: (id: string) => void
}

// ─── Weight / style keyword helpers ────────────────────────────────────────

// All recognised weight/style identifiers (compound forms listed before their parts)
const WEIGHT_STYLE_KEYWORDS = [
  'ThinItalic', 'HairlineItalic',
  'ExtraLightItalic', 'UltraLightItalic',
  'LightItalic',
  'RegularItalic',
  'MediumItalic',
  'SemiBoldItalic', 'DemiBoldItalic',
  'BoldItalic',
  'ExtraBoldItalic', 'UltraBoldItalic',
  'BlackItalic', 'HeavyItalic',
  'UltraItalic',
  'Thin', 'Hairline',
  'ExtraLight', 'UltraLight',
  'Light',
  'Regular',
  'Medium',
  'SemiBold', 'DemiBold',
  'Bold',
  'ExtraBold', 'UltraBold',
  'Black', 'Heavy',
  'Ultra',
  'Italic', 'Oblique',
]

const WEIGHT_ORDER: Record<string, number> = {
  thin: 100, hairline: 100,
  thinitalic: 101, hairlineitalic: 101,
  extralight: 200, ultralight: 200,
  extralightitalic: 201, ultralightitalic: 201,
  light: 300,
  lightitalic: 301,
  regular: 400,
  regularitalic: 401, italic: 401, oblique: 401,
  medium: 500,
  mediumitalic: 501,
  semibold: 600, demibold: 600,
  semibolditalic: 601, demibolditalic: 601,
  bold: 700,
  bolditalic: 701,
  extrabold: 800, ultrabold: 800,
  extrabolditalic: 801, ultrabolditalic: 801,
  black: 900, heavy: 900,
  blackitalic: 901, heavyitalic: 901,
  ultra: 950,
  ultraitalic: 951,
}

const KEYWORD_SET = new Set(WEIGHT_STYLE_KEYWORDS.map(k => k.toLowerCase()))

/** Everything before the first weight/style keyword word (ignoring trailing "Trial"). */
function extractBaseName(name: string): string {
  const withoutTrial = name.replace(/\s+Trial\s*$/i, '').trim()
  const words = withoutTrial.split(' ')
  for (let i = 0; i < words.length; i++) {
    if (KEYWORD_SET.has(words[i].toLowerCase())) {
      const base = words.slice(0, i).join(' ')
      return base || withoutTrial // guard against keyword-only names
    }
  }
  return withoutTrial
}

/** The variant portion of a font name (e.g. "ThinItalic", "Bold"), stripped of base and "Trial". */
function getVariantName(fontName: string, baseName: string): string {
  let variant = fontName
  if (variant.toLowerCase().startsWith(baseName.toLowerCase())) {
    variant = variant.slice(baseName.length).trim()
  }
  variant = variant.replace(/\s+Trial\s*$/i, '').trim()
  return variant || 'Regular'
}

/** Numeric sort key for a variant name. */
function weightOrder(variantName: string): number {
  const key = variantName.toLowerCase().replace(/\s+/g, '')
  return WEIGHT_ORDER[key] ?? 400
}

// ─── Grouping ───────────────────────────────────────────────────────────────

interface FontGroup {
  baseName: string
  fonts: Font[]
}

function groupFonts(fonts: Font[]): FontGroup[] {
  const map = new Map<string, Font[]>()

  for (const font of fonts) {
    const base = extractBaseName(font.name)
    if (!map.has(base)) map.set(base, [])
    map.get(base)!.push(font)
  }

  return Array.from(map.entries())
    .map(([baseName, groupFonts]) => ({
      baseName,
      fonts: [...groupFonts].sort((a, b) => {
        const vA = getVariantName(a.name, baseName)
        const vB = getVariantName(b.name, baseName)
        return weightOrder(vA) - weightOrder(vB)
      }),
    }))
    .sort((a, b) => a.baseName.localeCompare(b.baseName))
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Single full-width card for a font with no siblings in its family. */
function FontCard({ font, onDelete }: { font: Font; onDelete: (id: string) => void }) {
  injectFontFace(font.family, font.file_url, font.format)
  return (
    <div className="group bg-white border border-[#E5E5E5] rounded-lg p-4 hover:border-[#AAAAAA] transition-colors">
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
      <p style={{ fontFamily: `'${font.family}'` }} className="text-2xl text-[#111111]">Aa</p>
      <p style={{ fontFamily: `'${font.family}'` }} className="text-xs text-[#6B6B6B] mt-1">
        The quick brown fox jumps over the lazy dog
      </p>
    </div>
  )
}

/** A compact row displayed inside a font folder. */
function FontRow({
  font,
  baseName,
  onDelete,
}: {
  font: Font
  baseName: string
  onDelete: (id: string) => void
}) {
  const variantName = getVariantName(font.name, baseName)
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFAFA] transition-colors border-b border-[#E5E5E5] last:border-b-0">
      {/* "Aa" in this specific variant */}
      <span
        style={{ fontFamily: `'${font.family}'` }}
        className="text-base text-[#111111] w-7 text-center shrink-0"
      >
        Aa
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#111111]">{variantName}</p>
        <p
          style={{ fontFamily: `'${font.family}'` }}
          className="text-xs text-[#6B6B6B] truncate"
        >
          The quick brown fox jumps over the lazy dog
        </p>
      </div>

      <span className="text-xs text-[#AAAAAA] shrink-0 uppercase">{font.format}</span>

      <button
        onClick={() => onDelete(font.id)}
        className="p-1 rounded text-[#AAAAAA] hover:text-[#EF4444] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/** Collapsible folder for a font family that has multiple variants. */
function FontFolder({
  group,
  onDelete,
}: {
  group: FontGroup
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(true)

  // Inject all font-faces up front so the header preview renders immediately
  group.fonts.forEach(font => injectFontFace(font.family, font.file_url, font.format))

  // Pick a "regular" (non-italic) variant for the header preview
  const previewFont =
    group.fonts.find(f => /^regular$/i.test(getVariantName(f.name, group.baseName))) ??
    group.fonts.find(f => !/italic/i.test(f.name)) ??
    group.fonts[0]

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden hover:border-[#AAAAAA] transition-colors">
      {/* Folder header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        {open
          ? <ChevronDown size={14} className="text-[#AAAAAA] shrink-0" />
          : <ChevronRight size={14} className="text-[#AAAAAA] shrink-0" />
        }

        {/* Preview "Aa" in the regular variant */}
        <span
          style={{ fontFamily: `'${previewFont.family}'` }}
          className="text-base text-[#111111] w-7 text-center shrink-0"
        >
          Aa
        </span>

        <span className="text-sm font-medium text-[#111111] flex-1 truncate">
          {group.baseName}
        </span>

        <span className="text-xs text-[#AAAAAA] shrink-0">
          {group.fonts.length} variant{group.fonts.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Variant rows */}
      {open && (
        <div className="border-t border-[#E5E5E5]">
          {group.fonts.map(font => (
            <FontRow
              key={font.id}
              font={font}
              baseName={group.baseName}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Public component ────────────────────────────────────────────────────────

export function FontList({ fonts, onDelete }: FontListProps) {
  if (fonts.length === 0) {
    return (
      <p className="text-sm text-[#AAAAAA] text-center py-8">
        No fonts uploaded yet. Add a font above to use it in your documents.
      </p>
    )
  }

  const groups = groupFonts(fonts)

  return (
    <div className="flex flex-col gap-3">
      {groups.map(group =>
        group.fonts.length === 1 ? (
          <FontCard key={group.baseName} font={group.fonts[0]} onDelete={onDelete} />
        ) : (
          <FontFolder key={group.baseName} group={group} onDelete={onDelete} />
        )
      )}
    </div>
  )
}
