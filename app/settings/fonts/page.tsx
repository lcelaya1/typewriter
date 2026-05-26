'use client'

export const dynamic = 'force-dynamic'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useFonts } from '@/hooks/useFonts'
import { FontUploader } from '@/components/fonts/FontUploader'
import { FontList } from '@/components/fonts/FontList'

export default function FontSettingsPage() {
  const { fonts, loading, uploadFont, deleteFont } = useFonts()

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-[#E5E5E5] px-6 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111] transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-[#111111]">Font library</h1>
          <p className="text-xs text-[#6B6B6B]">Upload custom fonts to use in your documents</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <FontUploader onUpload={uploadFont} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-[#E5E5E5] rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-[#F5F5F5] rounded w-24 mb-2" />
                <div className="h-3 bg-[#F5F5F5] rounded w-12 mb-4" />
                <div className="h-8 bg-[#F5F5F5] rounded w-12" />
              </div>
            ))}
          </div>
        ) : (
          <FontList fonts={fonts} onDelete={deleteFont} />
        )}
      </main>
    </div>
  )
}
