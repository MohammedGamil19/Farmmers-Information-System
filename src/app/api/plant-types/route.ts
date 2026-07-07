export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const plantTypes = await prisma.plantType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { farms: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })
    return NextResponse.json({ plantTypes })
  } catch (err) {
    console.error('[GET /api/plant-types]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const plantType = await prisma.plantType.create({
      data: {
        name: body.name,
        description: body.description,
        growthDays: body.growthDays || 30,
        createdById: user.userId,
      },
    })
    return NextResponse.json({ plantType }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/plant-types]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
