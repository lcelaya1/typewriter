import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import mammoth from 'mammoth'

/** Extract the document ID from any Google Docs URL format */
function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/** Try to extract the human-readable title from the Google Docs HTML export */
async function fetchGoogleDocTitle(docId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://docs.google.com/document/d/${docId}/export?format=html`,
      { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Typewriter/1.0)' } }
    )
    if (!res.ok) return 'Imported Google Doc'
    const html = await res.text()
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (!match) return 'Imported Google Doc'
    return match[1]
      .replace(/ [-–] Google Docs?$/i, '')
      .replace(/ [-–] Google Drive?$/i, '')
      .trim() || 'Imported Google Doc'
  } catch {
    return 'Imported Google Doc'
  }
}

// POST /api/import
// Accepts:
//   • JSON body { url: string }  — import from a Google Docs share link
//   • FormData { file: File }    — import from a local .docx file (kept as fallback)
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = request.headers.get('content-type') || ''
  let buffer: Buffer
  let title = 'Imported document'

  // ── Google Docs URL import ──────────────────────────────────────────────
  if (contentType.includes('application/json')) {
    const body = await request.json() as { url?: string }

    if (!body.url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const docId = extractGoogleDocId(body.url)
    if (!docId) {
      return NextResponse.json({ error: 'Not a valid Google Docs URL' }, { status: 400 })
    }

    // Fetch .docx export — works for any doc shared as "anyone with link can view"
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`
    let res: Response
    try {
      res = await fetch(exportUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Typewriter/1.0)' },
      })
    } catch {
      return NextResponse.json({ error: 'Could not connect to Google Docs. Check your internet connection.' }, { status: 502 })
    }

    // If Google returned HTML it means we hit the login wall — doc isn't public
    const resType = res.headers.get('content-type') || ''
    if (!res.ok || resType.includes('text/html')) {
      return NextResponse.json({
        error: 'Document is not accessible. Open the doc in Google Docs, click Share → change to "Anyone with the link can view", then try again.',
      }, { status: 400 })
    }

    buffer = Buffer.from(await res.arrayBuffer())

    // Fetch the human-readable title in parallel (best-effort)
    title = await fetchGoogleDocTitle(docId)

  // ── .docx file upload (kept as a fallback) ──────────────────────────────
  } else {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'docx') {
      return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 })
    }

    buffer = Buffer.from(await file.arrayBuffer())
    title = file.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' ').trim() || 'Imported document'
  }

  // ── Convert .docx → HTML via mammoth ────────────────────────────────────
  const { value: html, messages } = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Title'] => h1",
      "p[style-name='Subtitle'] => h2",
    ],
  })

  if (!html.trim()) {
    return NextResponse.json({ error: 'No content could be extracted from this document' }, { status: 400 })
  }

  if (messages.length) {
    console.log('[import] mammoth:', messages.map(m => m.message).join('; '))
  }

  // Store HTML — the editor parses it into Tiptap JSON on first load
  const { data, error } = await adminClient
    .from('documents')
    .insert({ owner_id: user.id, title, content: { _importedHtml: html } })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
