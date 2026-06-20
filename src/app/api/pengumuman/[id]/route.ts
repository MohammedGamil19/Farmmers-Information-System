export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const ann = await prisma.announcement.update({
    where: { id },
    data: {
      title: body.title, content: body.content, type: body.type,
      isPublished: body.isPublished,
      publishedAt: body.isPublished ? new Date() : undefined,
    },
    include: { author: { select: { id: true, name: true } }, village: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ announcement: ann })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await prisma.announcement.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
