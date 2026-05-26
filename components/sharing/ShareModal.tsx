'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { useCollaborators } from '@/hooks/useCollaborators'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareModalProps {
  documentId: string
  currentUserId: string
  onClose: () => void
}

export function ShareModal({ documentId, currentUserId, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor'>('editor')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { collaborators, addCollaborator, updateRole, removeCollaborator } = useCollaborators(documentId)
  const supabase = createClient()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setMessage(null)

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .single()

    if (profile) {
      const { error } = await addCollaborator(profile.id, role, currentUserId)
      if (error) {
        setMessage({ type: 'error', text: 'Could not add collaborator.' })
      } else {
        setMessage({ type: 'success', text: `Added ${email} as ${role}.` })
        setEmail('')
      }
    } else {
      // Send invite email
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, email: email.trim(), role, invitedBy: currentUserId })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `Invite sent to ${email}.` })
        setEmail('')
      } else {
        setMessage({ type: 'error', text: 'Failed to send invite.' })
      }
    }
    setInviting(false)
  }

  return (
    <Modal open onClose={onClose} title="Share document">
      <div className="flex flex-col gap-4">
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1"
            />
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
                className="appearance-none pl-3 pr-7 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] cursor-pointer"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B6B] pointer-events-none" />
            </div>
          </div>
          <Button type="submit" disabled={!email.trim() || inviting}>
            {inviting ? 'Inviting…' : 'Invite'}
          </Button>
          {message && (
            <p className={cn('text-xs', message.type === 'success' ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {message.text}
            </p>
          )}
        </form>

        {collaborators.length > 0 && (
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-xs font-medium text-[#6B6B6B] mb-3">Current collaborators</p>
            <div className="space-y-2">
              {collaborators.map(collab => (
                <div key={collab.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      name={collab.profiles?.full_name || collab.profiles?.email || '?'}
                      src={collab.profiles?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-[#111111] truncate">{collab.profiles?.full_name || collab.profiles?.email}</p>
                      {collab.profiles?.full_name && (
                        <p className="text-xs text-[#AAAAAA] truncate">{collab.profiles?.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={collab.role}
                      onChange={e => updateRole(collab.id, e.target.value as 'viewer' | 'editor')}
                      className="text-xs border border-[#E5E5E5] rounded px-2 py-1 bg-white focus:outline-none"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeCollaborator(collab.id)}
                      className="p-1 rounded text-[#AAAAAA] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
