export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Only admins may edit user accounts / reset passwords
  if (user.role === 'FARMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name) data.name = body.name
  if (body.phone !== undefined) data.phone = body.phone
  if (body.nik !== undefined) data.nik = body.nik || null
  if (body.address !== undefined) data.address = body.address || null
  if (body.rt !== undefined) data.rt = body.rt || null
  if (body.rw !== undefined) data.rw = body.rw || null
  if (body.villageId !== undefined) data.villageId = body.villageId || null
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.role) data.role = body.role
  if (body.memberStatus) data.memberStatus = body.memberStatus
  if (body.password) data.password = await hashPassword(body.password)
  const updated = await prisma.user.update({ where: { id }, data, include: { village: true }, omit: { password: true } })
  await logActivity({
    userId: user.userId, action: 'UPDATE', entity: 'Pengguna', villageId: updated.villageId,
    detail: body.password ? `Mengatur ulang password ${updated.name}` : `Memperbarui pengguna ${updated.name}`,
  })
  return NextResponse.json({ user: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, villageId: true } })
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  await logActivity({
    userId: user.userId, action: 'DELETE', entity: 'Pengguna', villageId: target?.villageId ?? null,
    detail: `Menonaktifkan pengguna ${target?.name ?? ''}`.trim(),
  })
  return NextResponse.json({ message: 'Deleted' })
}