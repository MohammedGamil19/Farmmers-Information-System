export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// Returns the farm if the requesting user is allowed to access it, otherwise
// null. ADMIN can access everything; FARMER only farms they own.
async function getAuthorizedFarm(id: string, user: { userId: string; role: string }) {
  const farm = await prisma.farm.findUnique({ where: { id } })
  if (!farm) return null
  if (user.role !== 'FARMER') return farm
  if (farm.ownerId === user.userId) return farm
  return null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const authorized = await getAuthorizedFarm(id, user)
  if (!authorized) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  const farm = await prisma.farm.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      village: true,
      plantType: true,
      panens: {
        where: { isActive: true },
        orderBy: { tanggalPanen: 'desc' },
        include: { plantType: { select: { id: true, name: true } }, petani: { select: { id: true, name: true } } },
      },
    },
  })
  if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  return NextResponse.json({ farm })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const authorized = await getAuthorizedFarm(id, user)
  if (!authorized) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  const body = await request.json()
  // If starting a new cycle, auto-recalculate estimatedHarvest from plantingDate + growthDays
  let autoEstimatedHarvest: Date | undefined
  if (body.plantingDate && body.cropStage === 'SEEDLING') {
    // If a new plantTypeId is sent use it, otherwise fall back to the farm's current one
    const growthDays = body.plantTypeId
      ? (await prisma.plantType.findUnique({ where: { id: body.plantTypeId } }))?.growthDays
      : (await prisma.farm.findUnique({ where: { id }, include: { plantType: true } }))?.plantType?.growthDays
    if (growthDays) {
      const planting = new Date(body.plantingDate)
      autoEstimatedHarvest = new Date(planting)
      autoEstimatedHarvest.setDate(planting.getDate() + growthDays)
    }
  }

  const farm = await prisma.farm.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.area !== undefined && { area: body.area ? parseFloat(body.area) : null }),
      ...(body.status && { status: body.status }),
      ...(body.plantTypeId && { plantTypeId: body.plantTypeId }),
      ...(body.cropStage && { cropStage: body.cropStage }),
      ...(body.plantingDate && { plantingDate: new Date(body.plantingDate) }),
      ...(autoEstimatedHarvest && { estimatedHarvest: autoEstimatedHarvest }),
      ...(body.estimatedHarvest && { estimatedHarvest: new Date(body.estimatedHarvest) }),
      ...(body.actualHarvest && { actualHarvest: new Date(body.actualHarvest) }),
    },
    include: { owner: true, village: true, plantType: true },
  })
  return NextResponse.json({ farm })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const authorized = await getAuthorizedFarm(id, user)
  if (!authorized) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  await prisma.farm.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Farm deleted' })
}
