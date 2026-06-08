export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const farmId = searchParams.get('farmId')
  const days = parseInt(searchParams.get('days') || '30')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const recordWhere: Record<string, unknown> = { date: { gte: since } }
  const farmWhere:   Record<string, unknown> = { isActive: true }

  if (farmId) recordWhere.farmId = farmId

  if (user.role === 'FARMER') {
    recordWhere.farm = { ownerId: user.userId }
    farmWhere.ownerId = user.userId
  } else if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId) {
      recordWhere.farm = { villageId }
      farmWhere.villageId = villageId
    }
  }

  const [records, totalFarms, activeFarms, totalFarmers, readyForHarvest] = await Promise.all([
    prisma.monitoringRecord.findMany({
      where: recordWhere,
      orderBy: { date: 'asc' },
      select: {
        date: true, phValue: true, tdsValue: true, phStatus: true, tdsStatus: true,
        farm: { select: { id: true, name: true, plantType: { select: { name: true, minPH: true, maxPH: true, minTDS: true, maxTDS: true } } } },
      },
    }),
    prisma.farm.count({ where: farmWhere }),
    prisma.farm.count({ where: { ...farmWhere, status: { in: ['ACTIVE', 'GROWING'] } } }),
    user.role === 'SUPER_ADMIN'
      ? prisma.user.count({ where: { role: 'FARMER', isActive: true } })
      : Promise.resolve(null),
    prisma.farm.count({ where: { ...farmWhere, status: 'READY_FOR_HARVEST' } }),
  ])

  const avgPH  = records.length ? records.reduce((s, r) => s + r.phValue,  0) / records.length : 0
  const avgTDS = records.length ? records.reduce((s, r) => s + r.tdsValue, 0) / records.length : 0

  return NextResponse.json({
    records,
    stats: { totalFarms, activeFarms, totalFarmers, readyForHarvest,
      avgPH: Math.round(avgPH * 100) / 100, avgTDS: Math.round(avgTDS) },
  })
}
