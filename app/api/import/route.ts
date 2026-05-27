import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import mammoth from 'mammoth'

/** Extract the document ID from any Google Docs share URL */
function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Fetch the Google Docs .docx export with a hard timeout.
 * Returns the buffer on success, or throws with a user-friendly message.
 */
async function fetchDocxBuffer(docId: string): Promise<Buffer> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`

  // Hard 60-second timeout covers both the TCP handshake and body streaming.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)

  let res: Response
  try {
    res = await fetch(exportUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Typewriter/1.0)' },
    })
  } catch (err) {
    clearTimeout(timer)
    const name = (err as Error).name
    if (name === 'AbortError') {
      throw new Error(
        'The request timed out. Make sure your doc is shared as "Anyone with the link can view" and try again.'
      )
    }
    throw new Error('Could not reach Google Docs — check your internet connection.')
  }

  // If Google returned HTML it means we hit an auth-wall or cookie-gate.
  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok || ct.includes('text/html')) {
    clearTimeout(timer)
    throw new Error(
      'Document is not accessible. In Google Docs click Share → "Anyone with the link" → Viewer, then try again.'
    )
  }

  try {
    const ab = await res.arrayBuffer()
    clearTimeout(timer)
    return Buffer.from(ab)
  } catch {
    clearTimeout(timer)
    throw new Error('Failed to download the document — the connection was interrupted.')
  }
}

// POST /api/import
// Accepts:
//   • JSON body { url: string }  — import from a Google Docs share link
//   • FormData  { file: File }   — import from a local .docx file (fallback)
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = request.headers.get('content-type') ?? ''
  let buffer: Buffer
  let title = 'Imported document'

  // ── Google Docs URL ───────────────────────────────────────────────────────
  if (contentType.includes('application/json')) {
    const body = await request.json() as { url?: string }

    if (!body.url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const docId = extractGoogleDocId(body.url)
    if (!docId) {
      return NextResponse.json({ error: 'Not a valid Google Docs URL' }, { status: 400 })
    }

    try {
      buffer = await fetchDocxBuffer(docId)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }

    title = 'Imported from Google Docs'

  // ── Local .docx upload ────────────────────────────────────────────────────
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

  // ── Convert .docx → HTML via mammoth ─────────────────────────────────────
  // We skip embedded images: a typical Google Doc can have 60–70 MB of base64
  // image data which mammoth would expand to 90+ MB of HTML — far too large to
  // store. Skipping images keeps the HTML to a few hundred KB of text content.
  let imageCount = 0
  const { value: html, messages } = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Title'] => h1",
      "p[style-name='Subtitle'] => h2",
    ],
    convertImage: mammoth.images.imgElement(() => {
      imageCount++
      return Promise.resolve({ src: '' }) // emit <img src=""> — no base64 payload
    }),
  })

  if (messages.length) {
    console.log('[import] mammoth:', messages.map(m => m.message).join('; '))
  }

  if (!html.trim()) {
    return NextResponse.json(
      { error: 'No content could be extracted from this document. Is it empty?' },
      { status: 400 }
    )
  }

  // Strip any leftover bare <img> tags so the editor doesn't show broken images
  const cleanHtml = html.replace(/<img(?:\s[^>]*)?>/gi, '')

  // Guard: if the cleaned HTML is still unreasonably large something went wrong
  const SIZE_LIMIT = 10 * 1024 * 1024 // 10 MB
  if (cleanHtml.length > SIZE_LIMIT) {
    return NextResponse.json(
      { error: 'Document is too large to import. Try removing some content and re-exporting.' },
      { status: 400 }
    )
  }

  // Append an image notice if any images were found
  const imageNotice = imageCount > 0
    ? `<p><em>Note: ${imageCount} image${imageCount > 1 ? 's were' : ' was'} not imported (images are not supported in the current import).</em></p>`
    : ''

  // Store HTML — the editor converts it to Tiptap JSON on first load
  const { data, error } = await adminClient
    .from('documents')
    .insert({ owner_id: user.id, title, content: { _importedHtml: cleanHtml + imageNotice } })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
