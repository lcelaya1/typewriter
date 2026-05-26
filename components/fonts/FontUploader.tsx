'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle, XCircle, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FontUploaderProps {
  onUpload: (file: File) => Promise<{ error?: unknown }>
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface FileItem {
  file: File
  status: FileStatus
}

const ACCEPTED = '.woff2,.woff,.ttf,.otf'
const ALLOWED_EXTS = ['woff2', 'woff', 'ttf', 'otf']

export function FontUploader({ onUpload }: FontUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<FileItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ALLOWED_EXTS.includes(ext || '')
    })
    if (!valid.length) return

    // Add all files as pending
    const newItems: FileItem[] = valid.map(file => ({ file, status: 'pending' }))
    setItems(prev => [...newItems, ...prev])

    // Upload concurrently (max 3 at a time)
    const CONCURRENCY = 3
    const queue = [...newItems]

    async function uploadOne(item: FileItem) {
      setItems(prev => prev.map(i => i.file === item.file ? { ...i, status: 'uploading' } : i))
      const { error } = await onUpload(item.file)
      setItems(prev => prev.map(i =>
        i.file === item.file ? { ...i, status: error ? 'error' : 'done' } : i
      ))
    }

    // Process in batches of CONCURRENCY
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      await Promise.all(queue.slice(i, i + CONCURRENCY).map(uploadOne))
    }
  }, [onUpload])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const isUploading = items.some(i => i.status === 'uploading' || i.status === 'pending')
  const doneCount = items.filter(i => i.status === 'done').length
  const errorCount = items.filter(i => i.status === 'error').length

  return (
    <div className="flex flex-col gap-3">
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
            {isUploading ? 'Uploading…' : 'Drop font files here'}
          </p>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            or click to browse — .woff2, .woff, .ttf, .otf · select multiple files at once
          </p>
        </div>
        {!isUploading && doneCount > 0 && (
          <p className="text-xs text-[#22C55E]">
            {doneCount} font{doneCount > 1 ? 's' : ''} uploaded{errorCount > 0 ? `, ${errorCount} failed` : ''}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {/* Per-file progress list */}
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-white border border-[#E5E5E5] rounded-md">
              {item.status === 'uploading' || item.status === 'pending' ? (
                <Loader size={13} className="text-[#AAAAAA] animate-spin shrink-0" />
              ) : item.status === 'done' ? (
                <CheckCircle size={13} className="text-[#22C55E] shrink-0" />
              ) : (
                <XCircle size={13} className="text-[#EF4444] shrink-0" />
              )}
              <span className="text-xs text-[#111111] truncate flex-1">{item.file.name}</span>
              <span className="text-xs text-[#AAAAAA] shrink-0">
                {item.status === 'uploading' ? 'Uploading…'
                  : item.status === 'pending' ? 'Waiting…'
                  : item.status === 'done' ? 'Done'
                  : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
