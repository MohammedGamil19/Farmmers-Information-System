export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

/**
 * DELETE /api/farms/[id]/records
 * Permanently removes all monitoring records for a farm.
 * Only the farm owner, Village Admin, or Super Admin may do this.
 * Used when starting a new planting cycle.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const farm = await prisma.farm.findUnique({ where: { id } })
  if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 })

  const isOwner = farm.ownerId === user.userId
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'VILLAGE_ADMIN'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { count } = await prisma.monitoringRecord.deleteMany({
    where: { farmId: id },
  })

  return NextResponse.json({ deleted: count })
}
