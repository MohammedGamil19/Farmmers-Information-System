export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  if (body.nik) {
    const nikExists = await prisma.user.findFirst({ where: { nik: body.nik, NOT: { id } } })
    if (nikExists) return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
  }
  const member = await prisma.user.update({
    where: { id },
    data: {
      name: body.name,
      phone: body.phone ?? null,
      nik: body.nik ?? null,
      address: body.address ?? null,
      rt: body.rt ?? null,
      rw: body.rw ?? null,
      villageId: body.villageId ?? null,
      memberStatus: body.memberStatus,
      isActive: body.isActive,
    },
    select: {
      id: true, name: true, email: true, phone: true, nik: true,
      address: true, rt: true, rw: true, memberStatus: true, isActive: true,
      village: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ member })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.user.update({ where: { id }, data: { isActive: false, memberStatus: 'INACTIVE' } })
  return NextResponse.json({ message: 'Deleted' })
}
