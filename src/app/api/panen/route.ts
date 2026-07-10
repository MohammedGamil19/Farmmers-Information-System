export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where: Record<string, unknown> = { isActive: true }

  if (user.role === 'FARMER') {
    where.petaniId = user.userId
  }
  // Admin: global — sees all harvest records

  const panens = await prisma.panen.findMany({
    where,
    include: {
      petani: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      farm: { select: { id: true, name: true } },
      plantType: { select: { id: true, name: true } },
    },
    orderBy: { tanggalPanen: 'desc' },
  })

  return NextResponse.json(panens)
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { tanggalPanen, farmId, jumlahKg, hargaJual, kondisi, catatan } = body

  if (!tanggalPanen || !farmId || !jumlahKg) {
    return NextResponse.json({ error: 'Tanggal panen, kebun, dan jumlah wajib diisi' }, { status: 400 })
  }

  // Everything (plant type, village, farmer) is derived from the selected garden
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: { plantType: { select: { id: true, name: true } } },
  })
  if (!farm || !farm.isActive) return NextResponse.json({ error: 'Kebun tidak ditemukan' }, { status: 404 })

  // Access control: farmers may only record harvest for their own gardens,
  // village admins only for gardens within their own village.
  if (user.role === 'FARMER' && farm.ownerId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // Admin: may record harvest for any garden

  const panen = await prisma.panen.create({
    data: {
      tanggalPanen: new Date(tanggalPanen),
      komoditas: farm.plantType.name,
      jumlahKg: parseFloat(jumlahKg),
      hargaJual: hargaJual ? parseFloat(hargaJual) : null,
      kondisi: kondisi || 'Baik',
      catatan: catatan || null,
      farmId: farm.id,
      plantTypeId: farm.plantType.id,
      petaniId: farm.ownerId,
      villageId: farm.villageId,
    },
    include: {
      petani: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      farm: { select: { id: true, name: true } },
      plantType: { select: { id: true, name: true } },
    },
  })

  await logActivity({
    userId: user.userId, action: 'CREATE', entity: 'Panen', villageId: farm.villageId,
    detail: `Menambah panen ${panen.jumlahKg} kg ${farm.plantType.name} di kebun ${farm.name}`,
  })

  return NextResponse.json(panen, { status: 201 })
}
