import * as Y from 'yjs'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export class SupabaseProvider {
  doc: Y.Doc
  documentId: string
  channel: RealtimeChannel | null = null
  connected = false
  awareness: Y.Doc

  constructor(doc: Y.Doc, documentId: string) {
    this.doc = doc
    this.documentId = documentId
    this.awareness = doc
    this.connect()
  }

  connect() {
    const supabase = createClient()
    this.channel = supabase.channel(`doc:${this.documentId}`, {
      config: { broadcast: { self: false } }
    })

    this.channel
      .on('broadcast', { event: 'ydoc-update' }, ({ payload }) => {
        const update = new Uint8Array(payload.update)
        Y.applyUpdate(this.doc, update)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.connected = true
      })

    this.doc.on('update', (update: Uint8Array) => {
      if (!this.connected) return
      this.channel?.send({
        type: 'broadcast',
        event: 'ydoc-update',
        payload: { update: Array.from(update) }
      })
    })
  }

  destroy() {
    this.doc.off('update', () => {})
    if (this.channel) {
      createClient().removeChannel(this.channel)
    }
  }
}
