export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const villageId = searchParams.get('villageId')
  const role = searchParams.get('role')
  const where: Record<string, unknown> = {}
  if (villageId) where.villageId = villageId
  if (role) where.role = role
  if (user.role === 'VILLAGE_ADMIN') {
    const admin = await prisma.user.findUnique({ where: { id: user.userId } })
    if (admin?.villageId) where.villageId = admin.villageId
  }
  const users = await prisma.user.findMany({ where, include: { village: true }, omit: { password: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { name, email, password, role, phone, villageId } = body
  if (!name || !email || !password) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
  const hashed = await hashPassword(password)
  const newUser = await prisma.user.create({ data: { name, email, password: hashed, role: role || 'FARMER', phone, villageId }, include: { village: true }, omit: { password: true } })
  return NextResponse.json({ user: newUser }, { status: 201 })
}