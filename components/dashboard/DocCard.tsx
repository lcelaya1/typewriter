'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Trash2, LogOut, Pencil } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { Avatar } from '@/components/ui/Avatar'

interface DocCardProps {
  doc: {
    id: string
    title: string
    updated_at: string
    owner: { full_name: string | null; email: string | null; avatar_url: string | null } | null
    collaborators?: Array<{ profiles: { full_name: string | null; avatar_url: string | null } | null }>
  }
  isOwner: boolean
  onDelete: (id: string) => void
  onLeave: (id: string) => void
  onRename: (id: string, title: string) => void
}

export function DocCard({ doc, isOwner, onDelete, onLeave, onRename }: DocCardProps) {
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(doc.title)

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim()) {
      onRename(doc.id, title.trim())
      setRenaming(false)
    }
  }

  const menuItems = [
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      onClick: () => setRenaming(true),
      disabled: !isOwner,
    },
    ...(isOwner ? [{
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => onDelete(doc.id),
      destructive: true,
    }] : [{
      label: 'Leave',
      icon: <LogOut size={14} />,
      onClick: () => onLeave(doc.id),
      destructive: true,
    }]),
  ]

  return (
    <div className="group bg-white border border-[#E5E5E5] rounded-lg p-4 hover:border-[#AAAAAA] transition-colors">
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1">
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setRenaming(false)}
              className="w-full text-sm font-medium text-[#111111] border-b border-[#111111] outline-none bg-transparent pb-0.5"
            />
          </form>
        ) : (
          <Link href={`/docs/${doc.id}`} className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[#111111] truncate hover:text-[#333333]">
              {doc.title || 'Untitled'}
            </h3>
          </Link>
        )}
        <Dropdown
          trigger={
            <button className="p-1 rounded text-[#AAAAAA] hover:text-[#111111] hover:bg-[#F5F5F5] opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal size={14} />
            </button>
          }
          items={menuItems}
          align="right"
        />
      </div>

      <Link href={`/docs/${doc.id}`} className="block mt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Avatar
              name={doc.owner?.full_name || doc.owner?.email || 'Unknown'}
              src={doc.owner?.avatar_url}
              size="sm"
            />
            <span className="text-xs text-[#6B6B6B] truncate max-w-[120px]">
              {doc.owner?.full_name || doc.owner?.email || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {doc.collaborators?.slice(0, 3).map((c, i) => (
              <Avatar
                key={i}
                name={c.profiles?.full_name || '?'}
                src={c.profiles?.avatar_url}
                size="sm"
                className="-ml-1.5 border border-white"
              />
            ))}
            {(doc.collaborators?.length || 0) > 3 && (
              <span className="text-[10px] text-[#6B6B6B] ml-1">+{(doc.collaborators?.length || 0) - 3}</span>
            )}
          </div>
        </div>
        <p className="text-xs text-[#AAAAAA] mt-2">
          {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
        </p>
      </Link>
    </div>
  )
}
