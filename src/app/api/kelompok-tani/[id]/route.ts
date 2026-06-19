export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const kelompok = await prisma.kelompokTani.update({
    where: { id },
    data: { name: body.name, description: body.description },
    include: { village: true, _count: { select: { members: true, lahans: true } } },
  })
  return NextResponse.json({ kelompok })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.kelompokTani.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ message: 'Deleted' })
}
