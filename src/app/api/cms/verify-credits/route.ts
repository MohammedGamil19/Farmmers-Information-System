export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

// The password lives on the server (env var), so it is never shipped to the
// browser. Set CREDITS_PASSWORD in Vercel to override the default below.
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { password } = await request.json().catch(() => ({ password: '' }))
  const expected = process.env.CREDITS_PASSWORD || '1289233'

  if (typeof password !== 'string' || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
