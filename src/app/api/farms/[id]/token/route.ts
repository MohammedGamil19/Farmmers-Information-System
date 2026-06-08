export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

/**
 * POST /api/farms/[id]/token
 * Generates (or regenerates) the device token for a farm.
 * Only the farm owner, a Village Admin, or a Super Admin may do this.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the farm exists and the caller is allowed
  const farm = await prisma.farm.findUnique({ where: { id } })
  if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })

  const isOwner  = farm.ownerId === user.userId
  const isAdmin  = user.role === 'SUPER_ADMIN' || user.role === 'VILLAGE_ADMIN'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Generate a unique token: hydro_ + 32 hex chars
  const token = `hydro_${randomBytes(16).toString('hex')}`

  const updated = await prisma.farm.update({
    where: { id },
    data: { deviceToken: token },
  })

  return NextResponse.json({ token: updated.deviceToken })
}

/**
 * DELETE /api/farms/[id]/token
 * Revokes (clears) the device token — disconnects the device.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const farm = await prisma.farm.findUnique({ where: { id } })
  if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })

  const isOwner = farm.ownerId === user.userId
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'VILLAGE_ADMIN'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.farm.update({ where: { id }, data: { deviceToken: null } })
  return NextResponse.json({ ok: true })
}
