export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const ownerId = searchParams.get('ownerId')

  const where: Record<string, unknown> = { isActive: true }

  if (user.role === 'FARMER') {
    where.ownerId = user.userId
  } else if (user.role === 'VILLAGE_ADMIN') {
    const vid = await getAdminVillageId(user.userId)
    if (vid) where.villageId = vid
  }
  if (ownerId && user.role !== 'FARMER') where.ownerId = ownerId

  const lahans = await prisma.lahan.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, phone: true } },
      village: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalArea = lahans.reduce((s, l) => s + l.area, 0)
  return NextResponse.json({ lahans, totalArea })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { area, blockLocation, soilType, ownershipStatus, commodity, description, ownerId } = body

  // Resolve village with scope enforcement: farmers & village admins are pinned to their own village.
  let villageId: string | null = body.villageId || null
  if (user.role === 'FARMER') {
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    villageId = u?.villageId ?? null
  } else if (user.role === 'VILLAGE_ADMIN') {
    villageId = await getAdminVillageId(user.userId)
  }
  if (!area || !villageId) return NextResponse.json({ error: 'Luas lahan dan desa wajib diisi' }, { status: 400 })

  const resolvedOwnerId = user.role === 'FARMER' ? user.userId : (ownerId || user.userId)
  const lahan = await prisma.lahan.create({
    data: {
      area: parseFloat(area),
      blockLocation: blockLocation || null,
      soilType: soilType || null,
      ownershipStatus: ownershipStatus || 'OWNED',
      commodity: commodity || null,
      description: description || null,
      ownerId: resolvedOwnerId,
      villageId,
    },
    include: {
      owner: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ lahan }, { status: 201 })
}
