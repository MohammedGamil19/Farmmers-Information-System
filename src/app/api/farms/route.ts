export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const villageId = searchParams.get('villageId')
  const status = searchParams.get('status')
  const ownerId = searchParams.get('ownerId')

  const where: Record<string, unknown> = { isActive: true }
  if (user.role === 'FARMER') where.ownerId = user.userId
  else if (user.role === 'VILLAGE_ADMIN') {
    const admin = await prisma.user.findUnique({ where: { id: user.userId } })
    if (admin?.villageId) where.villageId = admin.villageId
  }
  if (villageId) where.villageId = villageId
  if (status) where.status = status
  if (ownerId && user.role !== 'FARMER') where.ownerId = ownerId

  const farms = await prisma.farm.findMany({
    where,
    include: { owner: { select: { id: true, name: true, email: true } }, village: true, plantType: true, monitoringRecords: { orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 3 } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ farms })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { name, description, location, area, plantTypeId, villageId, plantingDate, estimatedHarvest } = body
    if (!name || !plantTypeId || !villageId || !plantingDate) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    const ownerId = user.role === 'FARMER' ? user.userId : (body.ownerId || user.userId)
    const farm = await prisma.farm.create({
      data: { name, description, location, area: area ? parseFloat(area) : null, plantTypeId, villageId, ownerId, plantingDate: new Date(plantingDate), estimatedHarvest: estimatedHarvest ? new Date(estimatedHarvest) : null },
      include: { owner: true, village: true, plantType: true },
    })
    return NextResponse.json({ farm }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
