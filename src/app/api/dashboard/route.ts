export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date()
  since.setDate(since.getDate() - 14)

  const farmWhere: Record<string, unknown> = { isActive: true }
  const recordWhere: Record<string, unknown> = { date: { gte: since } }
  const notifWhere: Record<string, unknown> = { userId: user.userId }

  if (user.role === 'FARMER') {
    farmWhere.ownerId = user.userId
    recordWhere.farm = { ownerId: user.userId }
  } else if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId) {
      farmWhere.villageId = villageId
      recordWhere.farm = { villageId }
    }
  }

  // All queries fire in parallel — single DB round-trip batch
  const [records, totalFarms, activeFarms, totalFarmers, readyForHarvest, notifications, farms] =
    await Promise.all([
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
      prisma.notification.findMany({
        where: notifWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, message: true, type: true, isRead: true, createdAt: true },
      }),
      prisma.farm.findMany({
        where: farmWhere,
        select: {
          id: true, name: true, status: true, cropStage: true, plantingDate: true, estimatedHarvest: true,
          owner: { select: { id: true, name: true } },
          village: { select: { id: true, name: true } },
          plantType: { select: { id: true, name: true, growthDays: true, minPH: true, maxPH: true, minTDS: true, maxTDS: true } },
          monitoringRecords: { orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 3,
            select: { id: true, date: true, phValue: true, tdsValue: true, phStatus: true, tdsStatus: true, temperature: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  const avgPH  = records.length ? records.reduce((s, r) => s + r.phValue,  0) / records.length : 0
  const avgTDS = records.length ? records.reduce((s, r) => s + r.tdsValue, 0) / records.length : 0

  return NextResponse.json({
    records,
    farms,
    notifications,
    stats: {
      totalFarms,
      activeFarms,
      totalFarmers,
      readyForHarvest,
      avgPH:  Math.round(avgPH  * 100) / 100,
      avgTDS: Math.round(avgTDS),
    },
  })
}
