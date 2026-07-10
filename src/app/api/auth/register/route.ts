export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, villageId } = body

    // Phone is the primary identifier for villagers; email is optional
    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'Nama, No. HP, dan password wajib diisi' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    // A phone number can only be registered once
    const phoneTaken = await prisma.user.findFirst({ where: { phone } })
    if (phoneTaken) {
      return NextResponse.json({ error: 'No. HP sudah terdaftar' }, { status: 400 })
    }

    // Use the given email, or synthesize a placeholder so the unique constraint holds
    const finalEmail: string = (email && String(email).trim()) ? String(email).trim() : `${phone}@warga.local`
    const emailTaken = await prisma.user.findUnique({ where: { email: finalEmail } })
    if (emailTaken) {
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })
    }

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        name,
        email: finalEmail,
        password: hashed,
        role: 'FARMER',
        phone,
        villageId: villageId || null,
        // Self-registered villagers await admin approval
        memberStatus: 'PENDING',
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
