export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { email }, include: { village: true } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }
    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }
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
