export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, villageId } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
    }

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'FARMER',
        phone: phone || null,
        villageId: villageId || null,
      },
      include: { village: true },
      omit: { password: true },
    })

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name })
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, village: user.village },
      token,
    }, { status: 201 })
    response.cookies.set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 })
    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
