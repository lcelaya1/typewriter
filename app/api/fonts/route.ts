import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// GET /api/fonts — list user's fonts
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await adminClient
    .from('fonts')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

// POST /api/fonts — upload a font file
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowed = ['woff2', 'woff', 'ttf', 'otf']
  if (!ext || !allowed.includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const filePath = `${user.id}/${Date.now()}-${file.name}`

  // Ensure the fonts bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === 'fonts')
  if (!bucketExists) {
    await adminClient.storage.createBucket('fonts', { public: true })
  }

  // Upload file to storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await adminClient.storage
    .from('fonts')
    .upload(filePath, arrayBuffer, { contentType: file.type || 'font/ttf' })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

  const { data: { publicUrl } } = adminClient.storage.from('fonts').getPublicUrl(filePath)
  const family = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')

  const { data, error } = await adminClient
    .from('fonts')
    .insert({
      owner_id: user.id,
      name: family,
      family,
      file_url: publicUrl,
      file_path: filePath,
      format: ext as 'woff2' | 'woff' | 'ttf' | 'otf',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE /api/fonts?id=xxx
export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: font } = await adminClient.from('fonts').select('file_path').eq('id', id).single()
  if (font) await adminClient.storage.from('fonts').remove([(font as any).file_path])

  const { error } = await adminClient.from('fonts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
