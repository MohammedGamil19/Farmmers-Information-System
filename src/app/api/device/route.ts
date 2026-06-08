export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPhStatus, getTdsStatus } from '@/lib/recommendations'

/**
 * POST /api/device
 * No JWT required — authenticated by device token stored on the farm.
 *
 * Body: {
 *   token:       string   // device token from farm settings
 *   farmId:      string   // farm ID (double-check)
 *   phValue:     number
 *   tdsValue:    number
 *   temperature: number?
 *   humidity:    number?
 *   date:        string?  // ISO string; defaults to now
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, farmId, phValue, tdsValue, temperature, humidity, date } = body

    // ── Validate required fields ──────────────────────────────────────────
    if (!token || !farmId || phValue === undefined || tdsValue === undefined) {
      return NextResponse.json(
        { error: 'token, farmId, phValue, and tdsValue are required' },
        { status: 400 },
      )
    }

    // ── Look up farm by device token ──────────────────────────────────────
    const farm = await prisma.farm.findUnique({
      where: { deviceToken: token },
      include: { plantType: true, owner: true },
    })

    if (!farm) {
      return NextResponse.json({ error: 'Invalid device token' }, { status: 401 })
    }

    if (farm.id !== farmId) {
      return NextResponse.json(
        { error: 'Token does not match the provided farmId' },
        { status: 403 },
      )
    }

    // ── Classify values ───────────────────────────────────────────────────
    const phStatus  = getPhStatus(phValue,   farm.plantType.minPH,  farm.plantType.maxPH)
    const tdsStatus = getTdsStatus(tdsValue, farm.plantType.minTDS, farm.plantType.maxTDS)

    // ── Save record ───────────────────────────────────────────────────────
    const record = await prisma.monitoringRecord.create({
      data: {
        farmId:      farm.id,
        userId:      farm.ownerId,
        date:        date ? new Date(date) : new Date(),
        phValue:     parseFloat(phValue),
        tdsValue:    parseFloat(tdsValue),
        temperature: temperature !== undefined ? parseFloat(temperature) : null,
        humidity:    humidity    !== undefined ? parseFloat(humidity)    : null,
        phStatus,
        tdsStatus,
        source: 'DEVICE',
      },
    })

    // ── Notification if abnormal ──────────────────────────────────────────
    if (phStatus === 'ABNORMAL' || tdsStatus === 'ABNORMAL') {
      const msgs: string[] = []
      if (phStatus  === 'ABNORMAL') msgs.push(`pH: ${phValue}`)
      if (tdsStatus === 'ABNORMAL') msgs.push(`TDS: ${tdsValue} ppm`)
      await prisma.notification.create({
        data: {
          userId:  farm.ownerId,
          title:   '🔌 Sensor Mendeteksi Nilai Abnormal',
          message: `Perangkat sensor di ${farm.name} melaporkan: ${msgs.join(', ')} di luar batas normal.`,
          type:    phStatus === 'ABNORMAL' ? 'ABNORMAL_PH' : 'ABNORMAL_TDS',
        },
      })
    }

    return NextResponse.json({ ok: true, recordId: record.id, phStatus, tdsStatus }, { status: 201 })
  } catch (err) {
    console.error('[device API]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
