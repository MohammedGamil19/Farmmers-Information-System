export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, hashPassword } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name) data.name = body.name
  if (body.phone !== undefined) data.phone = body.phone
  if (body.villageId !== undefined) data.villageId = body.villageId
  if (body.isActive !== undefined && user.role === 'SUPER_ADMIN') data.isActive = body.isActive
  if (body.role && user.role === 'SUPER_ADMIN') data.role = body.role
  if (body.password) data.password = await hashPassword(body.password)
  const updated = await prisma.user.update({ where: { id }, data, include: { village: true }, omit: { password: true } })
  return NextResponse.json({ user: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Deleted' })
}