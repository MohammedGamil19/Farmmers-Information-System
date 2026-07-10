export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'
import { logActivity } from '@/lib/activity'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { tanggalPanen, farmId, jumlahKg, hargaJual, kondisi, catatan } = body

  const existing = await prisma.panen.findUnique({ where: { id } })
  if (!existing || !existing.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ownership / village checks against the existing record
  if (user.role === 'FARMER' && existing.petaniId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId && existing.villageId !== villageId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // If the garden changed, re-derive plant type / village / farmer from the new garden
  const derived: Record<string, unknown> = {}
  if (farmId && farmId !== existing.farmId) {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: { plantType: { select: { id: true, name: true } } },
    })
    if (!farm || !farm.isActive) return NextResponse.json({ error: 'Kebun tidak ditemukan' }, { status: 404 })
    if (user.role === 'VILLAGE_ADMIN') {
      const villageId = await getAdminVillageId(user.userId)
      if (villageId && farm.villageId !== villageId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    derived.farmId = farm.id
    derived.plantTypeId = farm.plantType.id
    derived.komoditas = farm.plantType.name
    derived.villageId = farm.villageId
    derived.petaniId = farm.ownerId
  }

  const panen = await prisma.panen.update({
    where: { id },
    data: {
      ...(tanggalPanen && { tanggalPanen: new Date(tanggalPanen) }),
      ...(jumlahKg && { jumlahKg: parseFloat(jumlahKg) }),
      hargaJual: hargaJual ? parseFloat(hargaJual) : null,
      ...(kondisi && { kondisi }),
      catatan: catatan || null,
      ...derived,
    },
    include: {
      petani: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      farm: { select: { id: true, name: true } },
      plantType: { select: { id: true, name: true } },
    },
  })

  await logActivity({
    userId: user.userId, action: 'UPDATE', entity: 'Panen', villageId: panen.village.id,
    detail: `Memperbarui panen ${panen.jumlahKg} kg ${panen.plantType.name} di kebun ${panen.farm.name}`,
  })

  return NextResponse.json(panen)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.panen.findUnique({ where: { id } })
  if (!existing || !existing.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'FARMER' && existing.petaniId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId && existing.villageId !== villageId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  await prisma.panen.update({ where: { id }, data: { isActive: false } })
  await logActivity({
    userId: user.userId, action: 'DELETE', entity: 'Panen', villageId: existing.villageId,
    detail: `Menghapus panen ${existing.jumlahKg} kg ${existing.komoditas}`,
  })
  return NextResponse.json({ success: true })
}
