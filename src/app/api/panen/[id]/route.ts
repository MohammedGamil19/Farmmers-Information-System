export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { tanggalPanen, komoditas, jumlahKg, hargaJual, catatan, lahanId } = body

  const existing = await prisma.panen.findUnique({ where: { id } })
  if (!existing || !existing.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'FARMER' && existing.petaniId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const panen = await prisma.panen.update({
    where: { id },
    data: {
      tanggalPanen: new Date(tanggalPanen),
      komoditas,
      jumlahKg: parseFloat(jumlahKg),
      hargaJual: hargaJual ? parseFloat(hargaJual) : null,
      catatan: catatan || null,
      lahanId: lahanId || null,
    },
    include: {
      petani: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      lahan: { select: { id: true, blockLocation: true, commodity: true } },
    },
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

  await prisma.panen.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
