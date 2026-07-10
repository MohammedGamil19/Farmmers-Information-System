export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const memberStatus = searchParams.get('memberStatus')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = { role: 'FARMER' }

  // Admin: sees all farmers. Farmer: only fellow farmers in their own village.
  if (user.role === 'FARMER') {
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { villageId: true } })
    if (u?.villageId) where.villageId = u.villageId
  }
  if (memberStatus) where.memberStatus = memberStatus
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nik: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  const members = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, phone: true, nik: true,
      address: true, rt: true, rw: true, memberStatus: true, isActive: true,
      createdAt: true,
      village: { select: { id: true, name: true } },
      _count: { select: { lahans: true, farms: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ members })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { name, email, password, phone, nik, address, rt, rw, memberStatus } = body
  if (!name || !email || !password) return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })

  // Admin picks the village from the form
  const villageId: string | null = body.villageId || null

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
  if (nik) {
    const nikExists = await prisma.user.findUnique({ where: { nik } })
    if (nikExists) return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
  }
  const hashed = await hashPassword(password)
  const member = await prisma.user.create({
    data: {
      name, email, password: hashed, role: 'FARMER', phone,
      nik: nik || null, address: address || null,
      rt: rt || null, rw: rw || null,
      villageId: villageId || null,
      memberStatus: memberStatus || 'ACTIVE',
    },
    select: {
      id: true, name: true, email: true, phone: true, nik: true,
      address: true, rt: true, rw: true, memberStatus: true,
      village: { select: { id: true, name: true } },
    },
  })
  await logActivity({
    userId: user.userId, action: 'CREATE', entity: 'Anggota', villageId,
    detail: `Menambah anggota ${member.name}`,
  })
  return NextResponse.json({ member }, { status: 201 })
}
