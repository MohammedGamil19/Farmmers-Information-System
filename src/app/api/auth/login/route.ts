export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accept login by email OR phone number (villagers often have no email)
    const identifier: string = (body.identifier ?? body.email ?? '').trim()
    const password: string = body.password
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/No. HP dan password wajib diisi' }, { status: 400 })
    }
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
      include: { village: true },
    })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Email/No. HP atau password salah' }, { status: 401 })
    }
    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Email/No. HP atau password salah' }, { status: 401 })
    }
    // Record last login (best-effort, non-blocking on failure)
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {})
    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name })
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, village: user.village },
      token,
    })
    response.cookies.set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 })
    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
