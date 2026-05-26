'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import type { PresenceUser } from '@/hooks/usePresence'

interface CollaboratorAvatarsProps {
  users: PresenceUser[]
  currentUserId: string
}

export function CollaboratorAvatars({ users, currentUserId }: CollaboratorAvatarsProps) {
  const others = users.filter(u => u.userId !== currentUserId)
  const visible = others.slice(0, 4)
  const overflow = others.length - 4

  return (
    <div className="flex items-center -space-x-2">
      {visible.map(user => (
        <Tooltip key={user.userId} content={user.name || user.email}>
          <div className="border-2 border-white rounded-full" style={{ borderColor: user.color }}>
            <Avatar name={user.name || user.email} size="sm" className="ring-1 ring-white" />
          </div>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full bg-[#E5E5E5] flex items-center justify-center text-[10px] font-medium text-[#6B6B6B] border-2 border-white z-10">
          +{overflow}
        </div>
      )}
    </div>
  )
}
