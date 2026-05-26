'use client'

import { useState, useEffect } from 'react'

export interface Font {
  id: string
  owner_id: string
  name: string
  family: string
  file_url: string
  file_path: string
  format: 'woff2' | 'woff' | 'ttf' | 'otf'
  created_at: string
}

export function useFonts() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const res = await window.fetch('/api/fonts')
      if (res.ok) setFonts(await res.json())
      setLoading(false)
    }
    fetch()
  }, [])

  async function uploadFont(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await window.fetch('/api/fonts', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (res.ok) setFonts(f => [data as Font, ...f])
    return { data: res.ok ? data : null, error: res.ok ? null : new Error(data.error) }
  }

  async function deleteFont(fontId: string) {
    const res = await window.fetch(`/api/fonts?id=${fontId}`, { method: 'DELETE' })
    if (res.ok) setFonts(f => f.filter(ft => ft.id !== fontId))
  }

  return { fonts, loading, uploadFont, deleteFont }
}
