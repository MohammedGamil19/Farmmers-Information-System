export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

const CMS_KEYS = ['cms_hero', 'cms_about', 'cms_gallery', 'cms_features', 'cms_show_stats', 'cms_credits']

const DEFAULTS: Record<string, unknown> = {
  cms_hero: {
    title: 'Hydroponic pH & TDS Monitoring System',
    subtitle: 'Membantu desa mendigitalisasi pertanian hidroponik melalui pemantauan cerdas dan keputusan berbasis data.',
    buttonText: 'Mulai Sekarang',
    images: [] as { id: string; url: string }[],
  },
  cms_about: {
    enabled: true,
    title: 'Tentang Program Hidroponik Desa',
    body: 'Program ini dikembangkan untuk membantu petani desa mengelola kebun hidroponik mereka secara digital. Dengan teknologi pemantauan modern, petani dapat memastikan tanaman tumbuh optimal setiap hari.',
    image: '',
  },
  cms_gallery: [],
  cms_features: [
    { icon: 'FlaskConical', title: 'Monitor pH & TDS', desc: 'Catat dan pantau nilai pH dan TDS setiap hari secara real-time dengan validasi otomatis.' },
    { icon: 'BarChart3', title: 'Analitik Canggih', desc: 'Grafik tren pH dan TDS, analisis pertumbuhan tanaman, dan performa panen.' },
    { icon: 'Bell', title: 'Notifikasi Pintar', desc: 'Peringatan otomatis saat nilai pH/TDS tidak normal atau panen akan tiba.' },
    { icon: 'CheckCircle', title: 'Rekomendasi Otomatis', desc: 'Saran perbaikan otomatis berdasarkan nilai pH dan TDS yang terdeteksi.' },
    { icon: 'Shield', title: 'Manajemen Peran', desc: 'Akses terpisah untuk Super Admin, Admin Desa, dan Petani.' },
    { icon: 'Leaf', title: 'Lacak Siklus Panen', desc: 'Pantau dari persemaian hingga panen dengan timeline visual yang lengkap.' },
  ],
  cms_show_stats: true,
  cms_credits: {
    enabled: true,
    universityLogo: '',
    universityName: 'Universitas 17 Agustus 1945 Surabaya',
    universityShort: 'UNTAG Surabaya',
    teamLogo: '',
    teamName: 'KKN Reguler R4',
    village: 'Desa Sukorejo, Bungah, Gresik',
    supervisor: '',
    createdBy: '',
    year: new Date().getFullYear().toString(),
    extraLogos: [] as { id: string; url: string; label: string }[],
  },
}

export async function GET() {
  try {
    const rows = await prisma.systemSetting.findMany({ where: { key: { in: CMS_KEYS } } })
    const result: Record<string, unknown> = { ...DEFAULTS }
    for (const row of rows) {
      try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = row.value }
    }
    return NextResponse.json({ cms: result })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ cms: DEFAULTS })
  }
}

export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { key, value } = body
    if (!CMS_KEYS.includes(key)) return NextResponse.json({ error: 'Invalid key' }, { status: 400 })

    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
