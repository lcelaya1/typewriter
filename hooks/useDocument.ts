'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/client'

export function useDocument(documentId: string) {
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const saveTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    async function fetchDocument() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      // Fetch via API to bypass RLS
      const res = await fetch(`/api/documents/${documentId}`)
      if (res.ok) {
        const doc = await res.json()
        setDocument(doc)
      }
      setLoading(false)
    }
    fetchDocument()
  }, [documentId])

  const saveContent = useCallback(async (content: object) => {
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
      })
      setSaveStatus(res.ok ? 'saved' : 'unsaved')
    }, 2000)
  }, [documentId])

  const saveTitle = useCallback(async (title: string) => {
    const res = await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) setDocument((d: any) => d ? { ...d, title } : d)
    return res.ok
  }, [documentId])

  return { document, loading, saveStatus, saveContent, saveTitle }
}
