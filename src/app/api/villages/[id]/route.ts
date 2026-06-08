export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const village = await prisma.village.update({ where: { id }, data: { name: body.name, district: body.district, province: body.province, description: body.description } })
  return NextResponse.json({ village })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.village.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Deleted' })
}