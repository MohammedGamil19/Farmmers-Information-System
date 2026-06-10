export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public, unauthenticated endpoint - used by the registration page so new
// users can pick their village before they have an account.
export async function GET() {
  const villages = await prisma.village.findMany({
    where: { isActive: true },
    select: { id: true, name: true, district: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ villages })
}
