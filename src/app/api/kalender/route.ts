export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '50')
  const where: Record<string, unknown> = {}
  if (user.role === 'VILLAGE_ADMIN') {
    const vid = await getAdminVillageId(user.userId)
    if (vid) where.villageId = vid
  } else if (user.role === 'FARMER') {
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    if (u?.villageId) where.villageId = u.villageId
  }
  if (from || to) {
    where.startDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }
  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'asc' },
    take: limit,
  })
  return NextResponse.json({ events })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { title, description, startDate, endDate, category, location, villageId } = body
  if (!title || !startDate || !villageId) return NextResponse.json({ error: 'Judul, tanggal, dan desa wajib diisi' }, { status: 400 })
  const event = await prisma.calendarEvent.create({
    data: {
      title, description: description || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      category: category || 'OTHER',
      location: location || null,
      villageId,
      createdById: user.userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ event }, { status: 201 })
}
