export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 60)

  const farmWhere: Record<string, unknown> = { isActive: true }
  const notifWhere: Record<string, unknown> = { userId: user.userId }
  const memberWhere: Record<string, unknown> = { role: 'FARMER', isActive: true }
  const lahanWhere: Record<string, unknown> = { isActive: true }
  const panenWhere: Record<string, unknown> = { isActive: true }
  const annWhere: Record<string, unknown> = { isPublished: true }
  const eventWhere: Record<string, unknown> = { startDate: { gte: now, lte: futureDate } }

  let villageId: string | null = null

  if (user.role === 'FARMER') {
    farmWhere.ownerId = user.userId
    lahanWhere.ownerId = user.userId
    panenWhere.petaniId = user.userId
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    villageId = u?.villageId ?? null
  }
  // Admin: global — no village scoping applied

  if (villageId) {
    annWhere.villageId = villageId
    eventWhere.villageId = villageId
  }

  const [
    totalFarms, activeFarms, totalFarmers, readyForHarvest,
    notifications, farms, totalMembers, lahanAgg, announcements, upcomingEvents,
    gapoktanSetting, panenList, recentPanens,
  ] = await Promise.all([
    prisma.farm.count({ where: farmWhere }),
    prisma.farm.count({ where: { ...farmWhere, status: { in: ['ACTIVE', 'GROWING'] } } }),
    user.role !== 'FARMER'
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
        plantType: { select: { id: true, name: true, growthDays: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.user.count({ where: memberWhere }),
    prisma.lahan.aggregate({ where: lahanWhere, _sum: { area: true }, _count: true }),
    prisma.announcement.findMany({
      where: annWhere,
      include: {
        author: { select: { id: true, name: true } },
        village: { select: { id: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    }),
    prisma.calendarEvent.findMany({
      where: eventWhere,
      include: {
        createdBy: { select: { id: true, name: true } },
        village: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 3,
    }),
    prisma.systemSetting.findUnique({ where: { key: 'gapoktan_name' } }),
    // All harvest records within the last 30 days for chart + aggregation
    prisma.panen.findMany({
      where: { ...panenWhere, tanggalPanen: { gte: since } },
      select: { tanggalPanen: true, jumlahKg: true, plantType: { select: { name: true } } },
      orderBy: { tanggalPanen: 'asc' },
    }),
    // Most recent harvests for the table
    prisma.panen.findMany({
      where: panenWhere,
      select: {
        id: true, tanggalPanen: true, komoditas: true, jumlahKg: true,
        farm: { select: { id: true, name: true } },
        petani: { select: { id: true, name: true } },
      },
      orderBy: { tanggalPanen: 'desc' },
      take: 5,
    }),
  ])

  // Harvest time series (kg per day)
  const byDay: Record<string, number> = {}
  for (const p of panenList) {
    const day = p.tanggalPanen.toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + p.jumlahKg
  }
  const harvestSeries = Object.entries(byDay).map(([date, kg]) => ({ date, kg: Math.round(kg * 10) / 10 }))

  // Totals across ALL harvest (not just last 30 days) for the headline stats
  const allPanen = await prisma.panen.findMany({ where: panenWhere, select: { komoditas: true, jumlahKg: true } })
  const totalProduksiKg = Math.round(allPanen.reduce((s, p) => s + p.jumlahKg, 0) * 10) / 10
  const komoditasMap: Record<string, number> = {}
  allPanen.forEach(p => { komoditasMap[p.komoditas] = (komoditasMap[p.komoditas] || 0) + p.jumlahKg })
  const komoditasTerbanyak = Object.entries(komoditasMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return NextResponse.json({
    farms, notifications, announcements, upcomingEvents, recentPanens, harvestSeries,
    gapoktanName: gapoktanSetting?.value ?? null,
    stats: {
      totalFarms, activeFarms, totalFarmers, readyForHarvest,
      totalMembers,
      totalLahan: Math.round((lahanAgg._sum.area ?? 0) * 100) / 100,
      totalLahanCount: lahanAgg._count,
      totalProduksiKg,
      totalPanen: allPanen.length,
      komoditasTerbanyak,
    },
  })
}
