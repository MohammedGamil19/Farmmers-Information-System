export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

async function canAccess(lahanId: string, user: { userId: string; role: string }) {
  const lahan = await prisma.lahan.findUnique({ where: { id: lahanId } })
  if (!lahan) return null
  if (user.role === 'SUPER_ADMIN') return lahan
  if (user.role === 'VILLAGE_ADMIN') {
    const vid = await getAdminVillageId(user.userId)
    return vid && lahan.villageId === vid ? lahan : null
  }
  return lahan.ownerId === user.userId ? lahan : null
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await canAccess(id, user)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json()
  const lahan = await prisma.lahan.update({
    where: { id },
    data: {
      area: body.area ? parseFloat(body.area) : undefined,
      blockLocation: body.blockLocation ?? null,
      soilType: body.soilType ?? null,
      ownershipStatus: body.ownershipStatus,
      commodity: body.commodity ?? null,
      description: body.description ?? null,
      kelompokTaniId: body.kelompokTaniId ?? null,
      ...(body.ownerId && user.role !== 'FARMER' ? { ownerId: body.ownerId } : {}),
    },
    include: {
      owner: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
      kelompokTani: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ lahan })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await canAccess(id, user)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.lahan.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Deleted' })
}
