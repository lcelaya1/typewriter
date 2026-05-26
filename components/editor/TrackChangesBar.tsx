'use client'

import { Check, X } from 'lucide-react'

interface TrackChangesBarProps {
  onAcceptAll: () => void
  onRejectAll: () => void
}

export function TrackChangesBar({ onAcceptAll, onRejectAll }: TrackChangesBarProps) {
  return (
    <div className="bg-[#DCFCE7] border-b border-[#86EFAC] px-4 py-2 flex items-center justify-between">
      <span className="text-xs font-medium text-[#166534]">Track changes active — pending changes in document</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAcceptAll}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors"
        >
          <Check size={11} />
          Accept all
        </button>
        <button
          onClick={onRejectAll}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#DC2626] bg-white border border-[#FECACA] hover:bg-red-50 rounded transition-colors"
        >
          <X size={11} />
          Reject all
        </button>
      </div>
    </div>
  )
}
