export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { village: true },
    omit: { password: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user: dbUser })
}
