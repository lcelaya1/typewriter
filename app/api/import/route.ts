import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import mammoth from 'mammoth'

// POST /api/import — convert a .docx file and create a new document
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'docx') {
    return NextResponse.json({ error: 'Only .docx files are supported. In Google Docs: File → Download → Microsoft Word (.docx)' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Convert .docx → HTML (preserves headings, bold, italic, lists, tables, links)
  const { value: html, messages } = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Title'] => h1",
      "p[style-name='Subtitle'] => p.subtitle",
    ],
  })

  if (!html.trim()) {
    return NextResponse.json({ error: 'Could not extract content from this file' }, { status: 400 })
  }

  // Strip the filename extension and clean up for a title
  const title = file.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' ').trim() || 'Imported document'

  // Store HTML in the content field — the editor will parse it into Tiptap JSON on first load
  const content = { _importedHtml: html }

  const { data, error } = await adminClient
    .from('documents')
    .insert({ owner_id: user.id, title, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Log any mammoth conversion warnings (non-fatal)
  if (messages.length) {
    console.log('[import] mammoth messages:', messages.map(m => m.message).join('; '))
  }

  return NextResponse.json(data)
}
