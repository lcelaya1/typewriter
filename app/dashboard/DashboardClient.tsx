'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Settings, LogOut, FileText, ExternalLink, X, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DocCard } from '@/components/dashboard/DocCard'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

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

// ── Progress stages ───────────────────────────────────────────────────────

const STAGES = [
  { label: 'Connecting to Google Docs…',  upTo: 14 },
  { label: 'Downloading document…',        upTo: 48 },
  { label: 'Converting content…',          upTo: 74 },
  { label: 'Preparing your document…',     upTo: 93 },
]

function stageLabel(pct: number) {
  return STAGES.find(s => pct < s.upTo)?.label ?? 'Almost done…'
}

function formatElapsed(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Google Docs import modal ──────────────────────────────────────────────

type Phase = 'form' | 'importing' | 'done' | 'error'

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (docId: string) => void }) {
  const [url, setUrl]         = useState('')
  const [phase, setPhase]     = useState<Phase>('form')
  const [error, setError]     = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed]   = useState(0)

  // Keep progress value in a ref so intervals don't capture stale state
  const progressRef = useRef(0)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setPhase('importing')
    setError(null)
    progressRef.current = 0
    setProgress(0)
    setElapsed(0)

    const startTime = Date.now()

    // ── elapsed counter ───────────────────────────────────────────────
    const elapsedId = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    // ── progress animation ────────────────────────────────────────────
    // Decay formula: starts fast, asymptotically approaches 93 %
    const progressId = setInterval(() => {
      const curr = progressRef.current
      const next = Math.min(93, curr + Math.max(0.25, (93 - curr) * 0.042))
      progressRef.current = next
      setProgress(next)
    }, 120)

    // ── API call ──────────────────────────────────────────────────────
    try {
      const res  = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      clearInterval(elapsedId)
      clearInterval(progressId)

      if (!res.ok) {
        setPhase('error')
        setError(data.error || 'Import failed')
        return
      }

      // Snap to 100 % then navigate
      progressRef.current = 100
      setProgress(100)
      setPhase('done')
      setTimeout(() => onSuccess(data.id), 750)
    } catch {
      clearInterval(elapsedId)
      clearInterval(progressId)
      setPhase('error')
      setError('Network error — please check your connection and try again.')
    }
  }

  // Animate progress bar transition duration (shorter when almost done)
  const transitionMs = progress >= 98 ? 300 : 350

  const GDocsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="3" fill="#4285F4"/>
      <rect x="4" y="5"  width="10" height="1.5" rx="0.75" fill="white"/>
      <rect x="4" y="8"  width="10" height="1.5" rx="0.75" fill="white"/>
      <rect x="4" y="11" width="7"  height="1.5" rx="0.75" fill="white"/>
    </svg>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md mx-4 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2.5">
            <GDocsIcon />
            <span className="text-sm font-semibold text-[#111111]">Import from Google Docs</span>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'importing'}
            className="p-1 rounded hover:bg-[#F5F5F5] text-[#AAAAAA] hover:text-[#111111] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Form view ──────────────────────────────────────────────── */}
        {(phase === 'form' || phase === 'error') && (
          <form onSubmit={handleImport} className="px-5 py-4 flex flex-col gap-4">
            <div className="bg-[#F8FAFF] border border-[#DBEAFE] rounded-lg px-3.5 py-3 text-xs leading-relaxed">
              <p className="font-medium text-[#3B82F6] mb-1">Before pasting, share your doc:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[#6B7FB8]">
                <li>Open your Google Doc</li>
                <li>Click <strong className="text-[#3B82F6]">Share → Change to anyone with the link</strong></li>
                <li>Set permission to <strong className="text-[#3B82F6]">Viewer</strong> (or Editor)</li>
                <li>Copy the link and paste it below</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1.5">Google Docs link</label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(null) }}
                  placeholder="https://docs.google.com/document/d/…"
                  required
                  autoFocus
                  className="w-full pl-3 pr-8 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111] placeholder:text-[#AAAAAA]"
                />
                <ExternalLink size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] pointer-events-none" />
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#EF4444] leading-relaxed bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" disabled={!url.trim()}>
                <ExternalLink size={12} />
                {phase === 'error' ? 'Try again' : 'Import'}
              </Button>
            </div>
          </form>
        )}

        {/* ── Progress view ───────────────────────────────────────────── */}
        {(phase === 'importing' || phase === 'done') && (
          <div className="px-5 py-8 flex flex-col gap-5">
            {/* Stage label + spinner / check */}
            <div className="flex items-center gap-2.5">
              {phase === 'done' ? (
                <CheckCircle2 size={16} className="text-[#22C55E] shrink-0" />
              ) : (
                <span className="relative flex h-4 w-4 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-30" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#3B82F6] opacity-70" />
                </span>
              )}
              <span className={cn(
                'text-sm font-medium transition-colors',
                phase === 'done' ? 'text-[#22C55E]' : 'text-[#111111]'
              )}>
                {phase === 'done' ? 'Import complete!' : stageLabel(progress)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#AAAAAA]">
                  {phase === 'done' ? 'Done' : 'Processing'}
                </span>
                <span className="text-xs font-medium text-[#111111] tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Track */}
              <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    phase === 'done' ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                  )}
                  style={{
                    width: `${progress}%`,
                    transition: `width ${transitionMs}ms ease-out`,
                  }}
                />
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {STAGES.map((stage, i) => {
                const stageStart = i === 0 ? 0 : STAGES[i - 1].upTo
                const active = progress >= stageStart
                const complete = progress >= stage.upTo
                return (
                  <div key={i} className="flex items-center gap-1.5 flex-1">
                    <div className={cn(
                      'h-1 rounded-full transition-all duration-500 flex-1',
                      complete ? 'bg-[#3B82F6]' : active ? 'bg-[#93C5FD]' : 'bg-[#E5E5E5]'
                    )} />
                    {i < STAGES.length - 1 && (
                      <div className={cn(
                        'w-1 h-1 rounded-full shrink-0 transition-all duration-300',
                        complete ? 'bg-[#3B82F6]' : 'bg-[#E5E5E5]'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time info */}
            <div className="flex items-center justify-between text-xs text-[#AAAAAA]">
              <span>
                {elapsed > 0 ? `${formatElapsed(elapsed)} elapsed` : 'Starting…'}
              </span>
              <span>Usually 5–20 seconds</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function DashboardClient({ initialDocs, user, profile }: Props) {
  const [docs, setDocs] = useState(initialDocs)
  const [creating, setCreating] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
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
            {/* Google Docs import */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImportModal(true)}
              disabled={creating}
            >
              {/* Mini Google Docs icon */}
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                <rect width="18" height="18" rx="3" fill="#4285F4"/>
                <rect x="4" y="5" width="10" height="1.5" rx="0.75" fill="white"/>
                <rect x="4" y="8" width="10" height="1.5" rx="0.75" fill="white"/>
                <rect x="4" y="11" width="7" height="1.5" rx="0.75" fill="white"/>
              </svg>
              Import Google Doc
            </Button>

            <Button onClick={handleNewDoc} disabled={creating} size="sm">
              <Plus size={14} />
              {creating ? 'Creating…' : 'New document'}
            </Button>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center mb-4">
              <FileText size={20} className="text-[#AAAAAA]" />
            </div>
            <p className="text-sm font-medium text-[#111111]">No documents yet</p>
            <p className="text-sm text-[#6B6B6B] mt-1 mb-4">
              Create a new document or import from Google Docs
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                  <rect width="18" height="18" rx="3" fill="#4285F4"/>
                  <rect x="4" y="5" width="10" height="1.5" rx="0.75" fill="white"/>
                  <rect x="4" y="8" width="10" height="1.5" rx="0.75" fill="white"/>
                  <rect x="4" y="11" width="7" height="1.5" rx="0.75" fill="white"/>
                </svg>
                Import Google Doc
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

      {/* Import modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={docId => {
            setShowImportModal(false)
            router.push(`/docs/${docId}`)
          }}
        />
      )}
    </div>
  )
}
