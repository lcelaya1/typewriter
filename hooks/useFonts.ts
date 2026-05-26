'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Font = Database['public']['Tables']['fonts']['Row']

export function useFonts() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('fonts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setFonts(data || [])
      setLoading(false)
    }
    fetch()
  }, [supabase])

  async function uploadFont(file: File) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    const ext = file.name.split('.').pop()?.toLowerCase() as Font['format']
    const filePath = `${user.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('fonts')
      .upload(filePath, file)
    if (uploadError) return { error: uploadError }

    const { data: { publicUrl } } = supabase.storage.from('fonts').getPublicUrl(filePath)
    const family = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')

    const { data, error } = await supabase
      .from('fonts')
      .insert({
        owner_id: user.id,
        name: family,
        family,
        file_url: publicUrl,
        file_path: filePath,
        format: ext || 'ttf',
      })
      .select()
      .single()

    if (!error && data) setFonts(f => [data, ...f])
    return { data, error }
  }

  async function deleteFont(fontId: string) {
    const font = fonts.find(f => f.id === fontId)
    if (!font) return

    await supabase.storage.from('fonts').remove([font.file_path])
    const { error } = await supabase.from('fonts').delete().eq('id', fontId)
    if (!error) setFonts(f => f.filter(ft => ft.id !== fontId))
  }

  return { fonts, loading, uploadFont, deleteFont }
}
