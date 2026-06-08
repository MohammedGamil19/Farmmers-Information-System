export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

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

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'hydroponic-monitor',
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 })
  }
}
