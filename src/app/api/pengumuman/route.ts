export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const where: Record<string, unknown> = { isPublished: true }
  if (user.role === 'VILLAGE_ADMIN') {
    const vid = await getAdminVillageId(user.userId)
    if (vid) where.villageId = vid
  } else if (user.role === 'FARMER') {
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    if (u?.villageId) where.villageId = u.villageId
  }
  const announcements = await prisma.announcement.findMany({
    where,
    include: { author: { select: { id: true, name: true } }, village: { select: { id: true, name: true } } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ announcements })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { title, content, type, villageId, isPublished } = body
  if (!title || !content || !villageId) return NextResponse.json({ error: 'Judul, isi, dan desa wajib diisi' }, { status: 400 })
  const ann = await prisma.announcement.create({
    data: {
      title, content,
      type: type || 'INFO',
      isPublished: isPublished !== false,
      publishedAt: new Date(),
      authorId: user.userId,
      villageId,
    },
    include: { author: { select: { id: true, name: true } }, village: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ announcement: ann }, { status: 201 })
}
