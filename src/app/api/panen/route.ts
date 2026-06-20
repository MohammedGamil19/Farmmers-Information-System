export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where: Record<string, unknown> = { isActive: true }

  if (user.role === 'FARMER') {
    where.petaniId = user.userId
  } else if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId) where.villageId = villageId
  }

  const panens = await prisma.panen.findMany({
    where,
    include: {
      petani: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      lahan: { select: { id: true, blockLocation: true, commodity: true } },
    },
    orderBy: { tanggalPanen: 'desc' },
  })

  return NextResponse.json(panens)
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'FARMER') {
    // Farmers can only add their own harvest
  }

  const body = await request.json()
  const { tanggalPanen, komoditas, jumlahKg, hargaJual, catatan, villageId, lahanId } = body

  if (!tanggalPanen || !komoditas || !jumlahKg || !villageId) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const petaniId = user.role === 'FARMER' ? user.userId : (body.petaniId || user.userId)

  const panen = await prisma.panen.create({
    data: {
      tanggalPanen: new Date(tanggalPanen),
      komoditas,
      jumlahKg: parseFloat(jumlahKg),
      hargaJual: hargaJual ? parseFloat(hargaJual) : null,
      catatan: catatan || null,
      petaniId,
      villageId,
      lahanId: lahanId || null,
    },
    include: {
      petani: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      lahan: { select: { id: true, blockLocation: true, commodity: true } },
    },
  })

  return NextResponse.json(panen, { status: 201 })
}
