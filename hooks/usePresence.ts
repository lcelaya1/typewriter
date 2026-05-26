'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  userId: string
  name: string
  email: string
  color: string
  online_at: string
}

const PRESENCE_COLORS = ['#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#EC4899']

function colorFor(userId: string) {
  let hash = 0
  for (const c of userId) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}

export function usePresence(documentId: string, currentUser: { id: string; name: string; email: string } | null) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser || !documentId) return

    const channel = supabase.channel(`presence:${documentId}`, {
      config: { presence: { key: currentUser.id } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const presenceUsers = Object.entries(state).map(([, values]) => {
          const v = (values as unknown as PresenceUser[])[0]
          return v
        }).filter(Boolean)
        setUsers(presenceUsers)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            color: colorFor(currentUser.id),
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [documentId, currentUser, supabase])

  return { users }
}
