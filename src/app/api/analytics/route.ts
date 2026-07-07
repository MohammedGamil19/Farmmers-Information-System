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
  const days = parseInt(searchParams.get('days') || '90')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const where: Record<string, unknown> = { isActive: true, tanggalPanen: { gte: since } }
  if (farmId) where.farmId = farmId

  if (user.role === 'FARMER') {
    where.petaniId = user.userId
  } else if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    if (villageId) where.villageId = villageId
  }

  const panens = await prisma.panen.findMany({
    where,
    select: {
      tanggalPanen: true,
      jumlahKg: true,
      hargaJual: true,
      farm: { select: { id: true, name: true } },
      plantType: { select: { id: true, name: true } },
    },
    orderBy: { tanggalPanen: 'asc' },
  })

  // Time series: kg per day
  const byDay: Record<string, number> = {}
  for (const p of panens) {
    const day = p.tanggalPanen.toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + p.jumlahKg
  }
  const timeSeries = Object.entries(byDay).map(([date, kg]) => ({ date, kg: Math.round(kg * 10) / 10 }))

  // kg per garden
  const byFarm: Record<string, { name: string; kg: number }> = {}
  for (const p of panens) {
    if (!byFarm[p.farm.id]) byFarm[p.farm.id] = { name: p.farm.name, kg: 0 }
    byFarm[p.farm.id].kg += p.jumlahKg
  }
  const perGarden = Object.values(byFarm)
    .map(v => ({ name: v.name, kg: Math.round(v.kg * 10) / 10 }))
    .sort((a, b) => b.kg - a.kg)

  // kg per plant type
  const byPlant: Record<string, { name: string; kg: number }> = {}
  for (const p of panens) {
    if (!byPlant[p.plantType.id]) byPlant[p.plantType.id] = { name: p.plantType.name, kg: 0 }
    byPlant[p.plantType.id].kg += p.jumlahKg
  }
  const perPlantType = Object.values(byPlant)
    .map(v => ({ name: v.name, kg: Math.round(v.kg * 10) / 10 }))
    .sort((a, b) => b.kg - a.kg)

  const totalKg = panens.reduce((s, p) => s + p.jumlahKg, 0)
  const totalValue = panens.reduce((s, p) => s + (p.hargaJual ? p.jumlahKg * p.hargaJual : 0), 0)

  return NextResponse.json({
    timeSeries,
    perGarden,
    perPlantType,
    stats: {
      totalKg: Math.round(totalKg * 10) / 10,
      totalPanen: panens.length,
      avgKg: panens.length ? Math.round((totalKg / panens.length) * 10) / 10 : 0,
      totalValue: Math.round(totalValue),
      topPlantType: perPlantType[0]?.name ?? null,
    },
  })
}
