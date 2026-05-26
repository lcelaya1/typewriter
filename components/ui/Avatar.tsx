'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: 'sm' | 'md'
  color?: string
  className?: string
}

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function colorFor(name: string) {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const displayName = name || '?'
  const color = colorFor(displayName)

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-medium overflow-hidden shrink-0',
      size === 'sm' && 'w-6 h-6 text-[10px]',
      size === 'md' && 'w-8 h-8 text-xs',
      !src && color,
      className
    )}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        getInitials(displayName)
      )}
    </div>
  )
}
