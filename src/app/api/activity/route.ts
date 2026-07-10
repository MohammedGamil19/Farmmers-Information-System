export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Activity log is an admin oversight tool
  if (user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')

  const where: Record<string, unknown> = {}
  if (user.role === 'VILLAGE_ADMIN') {
    const villageId = await getAdminVillageId(user.userId)
    where.villageId = villageId ?? '__none__'
  }
  if (entity) where.entity = entity

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ logs })
}
