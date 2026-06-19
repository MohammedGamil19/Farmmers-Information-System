export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description ?? null,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : null,
      category: body.category,
      location: body.location ?? null,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      village: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ event })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
