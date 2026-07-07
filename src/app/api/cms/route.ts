export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

const CMS_KEYS = ['cms_hero', 'cms_about', 'cms_gallery', 'cms_features', 'cms_show_stats', 'cms_credits']

const DEFAULTS: Record<string, unknown> = {
  cms_hero: {
    title: 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian',
    subtitle: 'Membantu GAPOKTAN mendigitalisasi pencatatan data hasil panen, keanggotaan, dan lahan pertanian secara terstruktur dan mudah diakses.',
    buttonText: 'Mulai Sekarang',
    images: [] as { id: string; url: string }[],
  },
  cms_about: {
    enabled: true,
    title: 'Tentang Sistem Informasi GAPOKTAN',
    body: 'Sistem ini dikembangkan untuk membantu GAPOKTAN mendokumentasikan data produksi hasil panen, keanggotaan, dan lahan pertanian secara digital dan terstruktur, sehingga produktivitas setiap kebun dan jenis tanaman dapat dipantau dengan mudah.',
    image: '',
  },
  cms_gallery: [],
  cms_features: [
    { icon: 'Leaf', title: 'Dokumentasi Data Panen', desc: 'Catat dan kelola data hasil panen, komoditas, jumlah produksi, dan nilai jual secara digital dan terstruktur.' },
    { icon: 'Users', title: 'Manajemen Data GAPOKTAN', desc: 'Kelola data anggota, lahan, dan kelompok tani dalam satu platform terpadu.' },
    { icon: 'BarChart3', title: 'Analitik Produksi', desc: 'Pantau tren produksi panen dan performa pertanian dari waktu ke waktu.' },
    { icon: 'Bell', title: 'Notifikasi & Pengumuman', desc: 'Informasi kegiatan dan pengumuman GAPOKTAN tersampaikan secara real-time.' },
    { icon: 'Shield', title: 'Manajemen Peran', desc: 'Akses terpisah untuk Super Admin, Admin Desa, dan Petani.' },
    { icon: 'FileText', title: 'Laporan & Ekspor Data', desc: 'Ekspor laporan produksi panen ke Excel dan PDF untuk keperluan pelaporan program.' },
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
