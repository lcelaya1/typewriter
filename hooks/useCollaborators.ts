'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Collaborator {
  id: string
  user_id: string
  role: 'viewer' | 'editor'
  accepted_at: string | null
  profiles: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

export function useCollaborators(documentId: string) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const res = await window.fetch(`/api/collaborators?documentId=${documentId}`)
      if (res.ok) setCollaborators(await res.json())
      setLoading(false)
    }
    fetch()
  }, [documentId])

  async function addCollaborator(userId: string, role: 'viewer' | 'editor', invitedBy: string) {
    const res = await window.fetch('/api/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, userId, role, invitedBy }),
    })
    const data = await res.json()
    if (res.ok) setCollaborators(c => [...c, data as Collaborator])
    return { error: res.ok ? null : new Error(data.error) }
  }

  async function updateRole(collaboratorId: string, role: 'viewer' | 'editor') {
    const res = await window.fetch(`/api/collaborators?id=${collaboratorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) setCollaborators(c => c.map(col => col.id === collaboratorId ? { ...col, role } : col))
    return { error: res.ok ? null : new Error('Failed') }
  }

  async function removeCollaborator(collaboratorId: string) {
    const res = await window.fetch(`/api/collaborators?id=${collaboratorId}`, { method: 'DELETE' })
    if (res.ok) setCollaborators(c => c.filter(col => col.id !== collaboratorId))
    return { error: res.ok ? null : new Error('Failed') }
  }

  return { collaborators, loading, addCollaborator, updateRole, removeCollaborator }
}
