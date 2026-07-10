export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// General key-value settings the admin can configure from the Settings page.
const ALLOWED_KEYS = ['gapoktan_name']

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: ALLOWED_KEYS } } })
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key] = r.value
  return NextResponse.json({ settings })
}

export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role === 'FARMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const { key, value } = body
  if (!ALLOWED_KEYS.includes(key)) return NextResponse.json({ error: 'Kunci pengaturan tidak dikenal' }, { status: 400 })
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: String(value ?? '') },
    update: { value: String(value ?? '') },
  })
  return NextResponse.json({ ok: true })
}
