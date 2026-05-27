import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import mammoth from 'mammoth'

/** Extract the document ID from any Google Docs share URL */
function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/** Derive a safe file extension from a MIME content-type string */
function extFromContentType(ct: string): string {
  const raw = (ct ?? 'image/png').split('/')[1]?.split(';')[0]?.trim() ?? 'png'
  if (raw === 'jpeg') return 'jpg'
  if (raw === 'svg+xml') return 'svg'
  return raw
}

/**
 * Fetch the Google Docs .docx export with a hard timeout.
 * Returns the buffer or throws with a user-friendly message.
 */
async function fetchDocxBuffer(docId: string): Promise<Buffer> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`

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
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        'The request timed out. Make sure your doc is shared as "Anyone with the link can view" and try again.'
      )
    }
    throw new Error('Could not reach Google Docs — check your internet connection.')
  }

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

/** Ensure the images bucket exists (creates it if missing). */
async function ensureImagesBucket(): Promise<boolean> {
  try {
    const { data: buckets } = await adminClient.storage.listBuckets()
    if (buckets?.some(b => b.name === 'images')) return true
    const { error } = await adminClient.storage.createBucket('images', { public: true })
    return !error
  } catch {
    return false
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

  // ── Ensure images bucket is ready ─────────────────────────────────────────
  const bucketReady = await ensureImagesBucket()
  const importFolder = `${user.id}/${Date.now()}`

  // ── Run mammoth — collect images with placeholders ────────────────────────
  // Strategy: during conversion we return a placeholder src (e.g. __img3__)
  // and save the image data. After mammoth finishes we upload all images to
  // Supabase Storage in parallel and swap the placeholders for real URLs.
  // This is much faster than sequential uploads inside the mammoth callback.

  interface PendingImage {
    placeholder: string
    data: Buffer
    contentType: string
  }
  const pendingImages: PendingImage[] = []
  let imgIdx = 0

  const { value: rawHtml, messages } = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Title'] => h1",
      "p[style-name='Subtitle'] => h2",
    ],
    convertImage: mammoth.images.imgElement(async (image) => {
      imgIdx++
      const placeholder = `__TWIMG${imgIdx}__`
      try {
        const b64 = await image.read('base64') as string
        pendingImages.push({
          placeholder,
          data: Buffer.from(b64, 'base64'),
          contentType: image.contentType ?? 'image/png',
        })
      } catch {
        // unreadable image — placeholder stays, will be stripped later
      }
      return { src: placeholder }
    }),
  })

  if (messages.length) {
    console.log('[import] mammoth:', messages.map(m => m.message).join('; '))
  }

  if (!rawHtml.trim()) {
    return NextResponse.json(
      { error: 'No content could be extracted from this document. Is it empty?' },
      { status: 400 }
    )
  }

  // ── Upload all images in parallel ─────────────────────────────────────────
  let failedUploads = 0
  let html = rawHtml

  if (pendingImages.length > 0 && bucketReady) {
    const uploadResults = await Promise.all(
      pendingImages.map(async ({ placeholder, data, contentType }) => {
        try {
          const ext = extFromContentType(contentType)
          const filePath = `${importFolder}-${placeholder.replace(/__/g, '')}.${ext}`

          const { error: uploadError } = await adminClient.storage
            .from('images')
            .upload(filePath, data, { contentType, cacheControl: '31536000' })

          if (uploadError) return { placeholder, url: null }

          const { data: { publicUrl } } = adminClient.storage.from('images').getPublicUrl(filePath)
          return { placeholder, url: publicUrl }
        } catch {
          return { placeholder, url: null }
        }
      })
    )

    // Swap placeholders for real URLs (or remove failed ones)
    for (const { placeholder, url } of uploadResults) {
      if (url) {
        html = html.replaceAll(placeholder, url)
      } else {
        failedUploads++
        // Remove the entire <img> tag for this placeholder
        html = html.replace(new RegExp(`<img[^>]*src="${placeholder}"[^>]*>`, 'g'), '')
      }
    }
  } else if (pendingImages.length > 0) {
    // Bucket setup failed — strip all placeholders
    failedUploads = pendingImages.length
    html = html.replace(/__TWIMG\d+__/g, '')
    html = html.replace(/<img[^>]*src="[^"]*"[^>]*>/g, '')
  }

  // Strip any remaining un-replaced placeholders (images that failed to read)
  html = html.replace(/<img[^>]*src="__TWIMG\d+__"[^>]*>/g, '')

  const failNote = failedUploads > 0
    ? `<p><em>Note: ${failedUploads} image${failedUploads > 1 ? 's' : ''} could not be imported.</em></p>`
    : ''

  // Guard against unexpectedly large HTML
  const finalHtml = html + failNote
  if (finalHtml.length > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Document is too large to import after processing. Try reducing the number of images.' },
      { status: 400 }
    )
  }

  // ── Save to database ───────────────────────────────────────────────────────
  const { data, error } = await adminClient
    .from('documents')
    .insert({ owner_id: user.id, title, content: { _importedHtml: finalHtml } })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
