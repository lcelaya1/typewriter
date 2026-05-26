'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Settings, LogOut, FileText, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DocCard } from '@/components/dashboard/DocCard'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

interface Doc {
  id: string
  title: string
  updated_at: string
  isOwner: boolean
  owner: { full_name: string | null; email: string | null; avatar_url: string | null } | null
  collaborators?: Array<{ profiles: { full_name: string | null; avatar_url: string | null } | null }>
}

interface Props {
  initialDocs: Doc[]
  user: { id: string; email?: string }
  profile: { full_name: string | null; email: string | null; avatar_url: string | null } | null
}

export default function DashboardClient({ initialDocs, user, profile }: Props) {
  const [docs, setDocs] = useState(initialDocs)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleNewDoc() {
    setCreating(true)
    const res = await fetch('/api/documents', { method: 'POST' })
    const data = await res.json()
    setCreating(false)
    if (res.ok && data.id) router.push(`/docs/${data.id}`)
  }

  async function handleDelete(docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
    if (res.ok) setDocs(d => d.filter(doc => doc.id !== docId))
  }

  async function handleLeave(docId: string) {
    const { error } = await supabase
      .from('document_collaborators')
      .delete()
      .eq('document_id', docId)
      .eq('user_id', user.id)
    if (!error) setDocs(d => d.filter(doc => doc.id !== docId))
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    setImportError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/import', { method: 'POST', body: formData })
    const data = await res.json()
    setImporting(false)

    if (!res.ok) {
      setImportError(data.error || 'Import failed')
      return
    }
    router.push(`/docs/${data.id}`)
  }

  async function handleRename(docId: string, title: string) {
    const res = await fetch(`/api/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) setDocs(d => d.map(doc => doc.id === docId ? { ...doc, title } : doc))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-base font-semibold tracking-tight">Typewriter</span>
        <div className="flex items-center gap-2">
          <Link href="/settings/fonts">
            <Button variant="ghost" size="sm">
              <Settings size={14} />
              Fonts
            </Button>
          </Link>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111] transition-colors"
          >
            <LogOut size={14} />
          </button>
          <Avatar
            name={profile?.full_name || profile?.email || user.email}
            src={profile?.avatar_url}
            size="sm"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Documents</h1>
          <div className="flex items-center gap-2">
            {/* Import .docx */}
            <input
              ref={importInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              disabled={importing || creating}
            >
              <Upload size={14} />
              {importing ? 'Importing…' : 'Import .docx'}
            </Button>

            <Button onClick={handleNewDoc} disabled={creating || importing} size="sm">
              <Plus size={14} />
              {creating ? 'Creating…' : 'New document'}
            </Button>
          </div>
        </div>

        {importError && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
            {importError}
          </div>
        )}

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center mb-4">
              <FileText size={20} className="text-[#AAAAAA]" />
            </div>
            <p className="text-sm font-medium text-[#111111]">No documents yet</p>
            <p className="text-sm text-[#6B6B6B] mt-1 mb-4">Create a new document or import a Google Doc</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => importInputRef.current?.click()} disabled={importing}>
                <Upload size={14} />
                {importing ? 'Importing…' : 'Import .docx'}
              </Button>
              <Button onClick={handleNewDoc} disabled={creating} size="sm">
                <Plus size={14} />
                New document
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                isOwner={doc.isOwner}
                onDelete={handleDelete}
                onLeave={handleLeave}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
