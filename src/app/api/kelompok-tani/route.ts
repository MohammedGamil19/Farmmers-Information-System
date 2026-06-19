export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const where: Record<string, unknown> = { isActive: true }
  if (user.role === 'VILLAGE_ADMIN') {
    const vid = await getAdminVillageId(user.userId)
    if (vid) where.villageId = vid
  } else if (user.role === 'FARMER') {
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    if (u?.villageId) where.villageId = u.villageId
  }
  const kelompoks = await prisma.kelompokTani.findMany({
    where,
    include: { village: true, _count: { select: { members: true, lahans: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ kelompoks })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { name, description, villageId } = body
  if (!name || !villageId) return NextResponse.json({ error: 'Nama dan desa wajib diisi' }, { status: 400 })
  const kelompok = await prisma.kelompokTani.create({
    data: { name, description, villageId },
    include: { village: true, _count: { select: { members: true, lahans: true } } },
  })
  return NextResponse.json({ kelompok }, { status: 201 })
}
