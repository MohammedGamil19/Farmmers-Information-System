export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Tidak ada file' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'Tipe file tidak didukung (JPG, PNG, WEBP, GIF)' }, { status: 400 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'Ukuran file maksimal 5 MB' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 })
  }
}
