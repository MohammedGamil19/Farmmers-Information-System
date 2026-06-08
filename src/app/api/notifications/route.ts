export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notifications = await prisma.notification.findMany({ where: { userId: user.userId }, orderBy: { createdAt: 'desc' }, take: 20 })
  return NextResponse.json({ notifications })
}

export async function PATCH(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.notification.updateMany({ where: { userId: user.userId, isRead: false }, data: { isRead: true } })
  return NextResponse.json({ message: 'All marked as read' })
}