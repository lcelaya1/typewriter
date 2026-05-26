'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={cn('bg-white border border-[#E5E5E5] rounded-lg shadow-lg w-full max-w-md mx-4', className)}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
            <h2 className="text-sm font-semibold text-[#111111]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
