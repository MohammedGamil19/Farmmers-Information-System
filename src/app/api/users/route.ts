export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const villageId = searchParams.get('villageId')
  const role = searchParams.get('role')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (villageId) where.villageId = villageId
  if (role) where.role = role
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nik: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      village: { select: { id: true, name: true } },
      _count: { select: { farms: true, lahans: true, panens: true } },
    },
    omit: { password: true },
    orderBy: { createdAt: 'desc' },
  })

  // Total harvested kg per user (for the farmer analytics)
  const panens = await prisma.panen.findMany({ where: { isActive: true }, select: { petaniId: true, jumlahKg: true } })
  const kgByUser: Record<string, number> = {}
  for (const p of panens) kgByUser[p.petaniId] = (kgByUser[p.petaniId] || 0) + p.jumlahKg

  const enriched = users.map(u => ({
    ...u,
    totalPanenKg: Math.round((kgByUser[u.id] || 0) * 10) / 10,
  }))

  return NextResponse.json({ users: enriched })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { name, email, password, role, phone, villageId, nik, address, rt, rw, memberStatus } = body
  if (!name || !email || !password) return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
  if (nik) {
    const nikExists = await prisma.user.findUnique({ where: { nik } })
    if (nikExists) return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
  }

  const hashed = await hashPassword(password)
  const newUser = await prisma.user.create({
    data: {
      name, email, password: hashed,
      role: role || 'FARMER',
      phone: phone || null,
      nik: nik || null,
      address: address || null,
      rt: rt || null,
      rw: rw || null,
      villageId: villageId || null,
      memberStatus: memberStatus || 'ACTIVE',
    },
    include: { village: { select: { id: true, name: true } } },
    omit: { password: true },
  })
  await logActivity({ userId: user.userId, action: 'CREATE', entity: 'Pengguna', villageId: newUser.villageId, detail: `Menambah ${newUser.role === 'FARMER' ? 'petani' : 'admin'} ${newUser.name}` })
  return NextResponse.json({ user: newUser }, { status: 201 })
}
