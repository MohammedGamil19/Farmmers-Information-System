export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.monitoringRecord.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  // Determine phStatus and tdsStatus based on the farm's plant type ranges
  const existing = await prisma.monitoringRecord.findUnique({
    where: { id },
    include: { farm: { include: { plantType: true } } },
  })
  let phStatus = 'NORMAL'
  let tdsStatus = 'NORMAL'
  if (existing?.farm?.plantType) {
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