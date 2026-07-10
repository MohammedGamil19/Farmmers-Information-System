export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { getAdminVillageId } from '@/lib/get-village-id'
import { logActivity } from '@/lib/activity'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Only admins may edit user accounts / reset passwords
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'VILLAGE_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, villageId: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Village admins may only manage FARMER accounts within their own village,
  // and can never touch other admins or elevate roles.
  if (user.role === 'VILLAGE_ADMIN') {
    const adminVillageId = await getAdminVillageId(user.userId)
    if (target.role !== 'FARMER' || !adminVillageId || target.villageId !== adminVillageId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name) data.name = body.name
  if (body.phone !== undefined) data.phone = body.phone
  if (body.villageId !== undefined && user.role === 'SUPER_ADMIN') data.villageId = body.villageId
  if (body.isActive !== undefined && user.role === 'SUPER_ADMIN') data.isActive = body.isActive
  if (body.role && user.role === 'SUPER_ADMIN') data.role = body.role
  if (body.memberStatus && (user.role === 'SUPER_ADMIN' || user.role === 'VILLAGE_ADMIN')) data.memberStatus = body.memberStatus
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
  if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, villageId: true } })
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  await logActivity({
    userId: user.userId, action: 'DELETE', entity: 'Pengguna', villageId: target?.villageId ?? null,
    detail: `Menonaktifkan pengguna ${target?.name ?? ''}`.trim(),
  })
  return NextResponse.json({ message: 'Deleted' })
}