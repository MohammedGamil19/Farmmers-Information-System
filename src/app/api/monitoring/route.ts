export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getPhStatus, getTdsStatus } from '@/lib/recommendations'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const farmId = searchParams.get('farmId')
  const limit = parseInt(searchParams.get('limit') || '50')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (farmId) where.farmId = farmId
  // Farmers see only records belonging to farms they own
  if (user.role === 'FARMER') {
    where.farm = { ownerId: user.userId }
  } else if (user.role === 'VILLAGE_ADMIN') {
    // Village admins only see records from farms in their own village
    const villageId = await getAdminVillageId(user.userId)
    if (villageId) where.farm = { villageId }
  }
  // Date range filter
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    }
  }
  const [records, total] = await Promise.all([
    prisma.monitoringRecord.findMany({
      where,
      include: { farm: { include: { plantType: true } }, user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    prisma.monitoringRecord.count({ where }),
  ])
  return NextResponse.json({ records, total })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { farmId, date, phValue, tdsValue, temperature, humidity, notes, actionTaken } = body
    if (!farmId || !date || phValue === undefined || tdsValue === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    const farm = await prisma.farm.findUnique({ where: { id: farmId }, include: { plantType: true } })
    if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    // Make sure the user is allowed to record data for this farm
    if (user.role === 'FARMER' && farm.ownerId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'VILLAGE_ADMIN') {
      const villageId = await getAdminVillageId(user.userId)
      if (villageId && farm.villageId !== villageId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const phStatus = getPhStatus(phValue, farm.plantType.minPH, farm.plantType.maxPH)
    const tdsStatus = getTdsStatus(tdsValue, farm.plantType.minTDS, farm.plantType.maxTDS)
    const record = await prisma.monitoringRecord.create({
      data: { farmId, userId: user.userId, date: new Date(date), phValue: parseFloat(phValue), tdsValue: parseFloat(tdsValue), temperature: temperature ? parseFloat(temperature) : null, humidity: humidity ? parseFloat(humidity) : null, notes, phStatus, tdsStatus, actionTaken: actionTaken || null },
      include: { farm: { include: { plantType: true } }, user: { select: { id: true, name: true } } },
    })
    // Create notification if abnormal
    if (phStatus === 'ABNORMAL' || tdsStatus === 'ABNORMAL') {
      const msgs = []
      if (phStatus === 'ABNORMAL') msgs.push(`pH: ${phValue}`)
      if (tdsStatus === 'ABNORMAL') msgs.push(`TDS: ${tdsValue} ppm`)
      await prisma.notification.create({
        data: { userId: user.userId, title: 'Nilai Abnormal Terdeteksi', message: `Farm ${farm.name}: ${msgs.join(', ')} di luar batas normal.`, type: phStatus === 'ABNORMAL' ? 'ABNORMAL_PH' : 'ABNORMAL_TDS' },
      })
    }
    return NextResponse.json({ record }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}