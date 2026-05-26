'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={cn(
          'absolute z-50 px-2 py-1 text-xs text-white bg-[#111111] rounded whitespace-nowrap pointer-events-none',
          'left-1/2 -translate-x-1/2',
          side === 'top' && 'bottom-full mb-1.5',
          side === 'bottom' && 'top-full mt-1.5',
        )}>
          {content}
        </div>
      )}
    </div>
  )
}
