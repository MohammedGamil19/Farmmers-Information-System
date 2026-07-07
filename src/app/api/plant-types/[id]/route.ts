export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    if (user.role === 'FARMER') {
      const existing = await prisma.plantType.findUnique({ where: { id } })
      if (!existing || existing.createdById !== user.userId) {
        return NextResponse.json({ error: 'Forbidden — Anda hanya dapat mengedit tanaman yang Anda tambahkan' }, { status: 403 })
      }
    }

    const body = await request.json()
    const plantType = await prisma.plantType.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? null,
        growthDays: body.growthDays,
      },
    })
    return NextResponse.json({ plantType })
  } catch (err) {
    console.error('[PUT /api/plant-types/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    if (user.role === 'FARMER') {
      const existing = await prisma.plantType.findUnique({ where: { id } })
      if (!existing || existing.createdById !== user.userId) {
        return NextResponse.json({ error: 'Forbidden — Anda hanya dapat menghapus tanaman yang Anda tambahkan' }, { status: 403 })
      }
    }

    const farmCount = await prisma.farm.count({ where: { plantTypeId: id } })
    if (farmCount > 0) {
      return NextResponse.json(
        { error: `Tidak dapat dihapus — digunakan oleh ${farmCount} kebun` },
        { status: 409 }
      )
    }
    await prisma.plantType.delete({ where: { id } })
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    console.error('[DELETE /api/plant-types/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
