export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const villages = await prisma.village.findMany({ where: { isActive: true }, include: { _count: { select: { users: true, farms: true } } }, orderBy: { name: 'asc' } })
  return NextResponse.json({ villages })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const village = await prisma.village.create({ data: { name: body.name, district: body.district, province: body.province, description: body.description } })
  return NextResponse.json({ village }, { status: 201 })
}