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
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 60)

  const farmWhere: Record<string, unknown> = { isActive: true }
  const recordWhere: Record<string, unknown> = { date: { gte: since } }
  const notifWhere: Record<string, unknown> = { userId: user.userId }
  const memberWhere: Record<string, unknown> = { role: 'FARMER', isActive: true }
  const lahanWhere: Record<string, unknown> = { isActive: true }
  const panenWhere: Record<string, unknown> = { isActive: true }
  const annWhere: Record<string, unknown> = { isPublished: true }
  const eventWhere: Record<string, unknown> = { startDate: { gte: now, lte: futureDate } }

  let villageId: string | null = null

  if (user.role === 'FARMER') {
    farmWhere.ownerId = user.userId
    recordWhere.farm = { ownerId: user.userId }
    lahanWhere.ownerId = user.userId
    panenWhere.petaniId = user.userId
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    villageId = u?.villageId ?? null
  } else if (user.role === 'VILLAGE_ADMIN') {
    villageId = await getAdminVillageId(user.userId)
    if (villageId) {
      farmWhere.villageId = villageId
      recordWhere.farm = { villageId }
      memberWhere.villageId = villageId
      lahanWhere.villageId = villageId
      panenWhere.villageId = villageId
    }
  }

  if (villageId) {
    annWhere.villageId = villageId
    eventWhere.villageId = villageId
  }

  const [
    records, totalFarms, activeFarms, totalFarmers, readyForHarvest,
    notifications, farms, totalMembers, lahanAgg, announcements, upcomingEvents,
    gapoktanSetting, panenAgg, panenKomoditas,
  ] = await Promise.all([
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
    // GAPOKTAN stats
    prisma.user.count({ where: memberWhere }),
    prisma.lahan.aggregate({ where: lahanWhere, _sum: { area: true }, _count: true }),
    prisma.announcement.findMany({
      where: annWhere,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    }),
    prisma.calendarEvent.findMany({
      where: eventWhere,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { startDate: 'asc' },
      take: 3,
    }),
    prisma.systemSetting.findUnique({ where: { key: 'gapoktan_name' } }),
    prisma.panen.aggregate({ where: panenWhere, _sum: { jumlahKg: true }, _count: true }),
    prisma.panen.groupBy({ by: ['komoditas'], where: panenWhere, _sum: { jumlahKg: true }, orderBy: { _sum: { jumlahKg: 'desc' } }, take: 1 }),
  ])

  const avgPH  = records.length ? records.reduce((s, r) => s + r.phValue,  0) / records.length : 0
  const avgTDS = records.length ? records.reduce((s, r) => s + r.tdsValue, 0) / records.length : 0

  return NextResponse.json({
    records, farms, notifications, announcements, upcomingEvents,
    gapoktanName: gapoktanSetting?.value ?? null,
    stats: {
      totalFarms, activeFarms, totalFarmers, readyForHarvest,
      totalMembers,
      totalLahan: Math.round((lahanAgg._sum.area ?? 0) * 100) / 100,
      totalLahanCount: lahanAgg._count,
      totalProduksiKg: Math.round((panenAgg._sum.jumlahKg ?? 0) * 10) / 10,
      totalPanen: panenAgg._count,
      komoditasTerbanyak: panenKomoditas[0]?.komoditas ?? null,
      avgPH:  Math.round(avgPH  * 100) / 100,
      avgTDS: Math.round(avgTDS),
    },
  })
}
