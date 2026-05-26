'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FontUploaderProps {
  onUpload: (file: File) => Promise<{ error?: unknown }>
}

const ACCEPTED = '.woff2,.woff,.ttf,.otf'

export function FontUploader({ onUpload }: FontUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['woff2', 'woff', 'ttf', 'otf'].includes(ext || '')) {
      setError('Only .woff2, .woff, .ttf, and .otf files are supported.')
      return
    }
    setError(null)
    setUploading(true)
    const { error } = await onUpload(file)
    if (error) setError('Upload failed. Please try again.')
    setUploading(false)
  }, [onUpload])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors',
        dragging ? 'border-[#111111] bg-[#F5F5F5]' : 'border-[#E5E5E5] hover:border-[#AAAAAA] bg-white'
      )}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', dragging ? 'bg-[#E5E5E5]' : 'bg-[#F5F5F5]')}>
        <Upload size={18} className="text-[#6B6B6B]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[#111111]">
          {uploading ? 'Uploading…' : 'Drop font file here'}
        </p>
        <p className="text-xs text-[#6B6B6B] mt-0.5">or click to browse — .woff2, .woff, .ttf, .otf</p>
      </div>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
    </div>
  )
}
