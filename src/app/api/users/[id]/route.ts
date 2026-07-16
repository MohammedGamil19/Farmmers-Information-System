export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { isDeveloper } from '@/lib/developer'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const isAdmin = user.role !== 'FARMER'
  const isSelf = user.userId === id
  // Anyone may edit their OWN profile; only admins may edit other accounts.
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const data: Record<string, unknown> = {}
  // Fields anyone may change on their own account
  if (body.name) data.name = body.name
  if (body.phone !== undefined) data.phone = body.phone
  if (body.password) data.password = await hashPassword(body.password)
  // Privileged fields: admins only (prevents self privilege escalation)
  if (isAdmin) {
    if (body.nik !== undefined) data.nik = body.nik || null
    if (body.address !== undefined) data.address = body.address || null
    if (body.rt !== undefined) data.rt = body.rt || null
    if (body.rw !== undefined) data.rw = body.rw || null
    if (body.villageId !== undefined) data.villageId = body.villageId || null
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.role) data.role = body.role
    if (body.memberStatus) data.memberStatus = body.memberStatus
  }
  const updated = await prisma.user.update({ where: { id }, data, include: { village: true }, omit: { password: true } })
  // Only record admin edits of OTHER accounts in the audit log (skip self profile tweaks)
  if (isAdmin && !isSelf) {
    await logActivity({
      userId: user.userId, action: 'UPDATE', entity: 'Pengguna', villageId: updated.villageId,
      detail: body.password ? `Mengatur ulang password ${updated.name}` : `Memperbarui pengguna ${updated.name}`,
    })
  }
  return NextResponse.json({ user: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  if (id === user.userId) {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true, villageId: true, _count: { select: { farms: true, lahans: true, panens: true } } },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (isDeveloper(target)) {
    return NextResponse.json({ error: 'Akun developer tidak dapat dihapus' }, { status: 403 })
  }

  // A user that still owns data can't be permanently removed (it would orphan
  // harvest/farm/land records). Ask the admin to deactivate instead.
  const linked = target._count.farms + target._count.lahans + target._count.panens
  if (linked > 0) {
    return NextResponse.json(
      { error: 'Pengguna masih memiliki data (kebun/lahan/panen). Nonaktifkan pengguna sebagai gantinya.' },
      { status: 409 }
    )
  }

  try {
    await prisma.activityLog.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })
  } catch {
    return NextResponse.json(
      { error: 'Tidak dapat menghapus permanen — pengguna memiliki data terkait. Nonaktifkan saja.' },
      { status: 409 }
    )
  }

  await logActivity({
    userId: user.userId, action: 'DELETE', entity: 'Pengguna', villageId: target.villageId ?? null,
    detail: `Menghapus pengguna ${target.name}`,
  })
  return NextResponse.json({ message: 'Deleted' })
}