export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

// Returns the record (with farm/village info) if the requesting user is
// allowed to access it, otherwise null. SUPER_ADMIN can access everything,
// VILLAGE_ADMIN only records from farms in their own village, FARMER only
// records from farms they own.
async function getAuthorizedRecord(id: string, user: { userId: string; role: string }) {
  const record = await prisma.monitoringRecord.findUnique({
    where: { id },
    include: { farm: { include: { plantType: true } } },
  })
  if (!record) return null
  if (user.role === 'SUPER_ADMIN') return record
  if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId && record.farm.villageId === villageId) return record
    return null
  }
  // FARMER
  if (record.farm.ownerId === user.userId) return record
  return null
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const record = await getAuthorizedRecord(id, user)
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.monitoringRecord.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const existing = await getAuthorizedRecord(id, user)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json()
  // Determine phStatus and tdsStatus based on the farm's plant type ranges
  let phStatus = 'NORMAL'
  let tdsStatus = 'NORMAL'
  if (existing.farm?.plantType) {
    const pt = existing.farm.plantType
    const ph = body.phValue ?? existing.phValue
    const tds = body.tdsValue ?? existing.tdsValue
    if (ph < pt.minPH || ph > pt.maxPH) phStatus = 'ABNORMAL'
    if (tds < pt.minTDS || tds > pt.maxTDS) tdsStatus = 'ABNORMAL'
  }
  const record = await prisma.monitoringRecord.update({
    where: { id },
    data: {
      phValue: body.phValue,
      tdsValue: body.tdsValue,
      temperature: body.temperature,
      humidity: body.humidity,
      notes: body.notes,
      phStatus,
      tdsStatus,
      ...(body.date ? { date: new Date(body.date) } : {}),
      ...(body.actionTaken !== undefined ? { actionTaken: body.actionTaken || null } : {}),
    },
  })
  return NextResponse.json({ record })
}
