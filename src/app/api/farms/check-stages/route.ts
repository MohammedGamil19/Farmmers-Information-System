export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import {
  calculateExpectedStage,
  isStageBehind,
  STAGE_LABELS,
  STAGE_EMOJI,
  STAGES,
  getNextStage,
} from '@/lib/farm-stages'

/**
 * POST /api/farms/check-stages
 *
 * Scans all farms accessible to the caller. For any farm whose current
 * cropStage is behind the date-calculated expected stage, creates a
 * SYSTEM notification (deduplicated — skips if an unread one already
 * exists for this farm + target stage).
 *
 * Returns { checked, notified } counts.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Scope farms the same way as GET /api/farms
  const where: Record<string, unknown> = { isActive: true }
  if (user.role === 'FARMER') {
    where.ownerId = user.userId
  } else if (user.role === 'VILLAGE_ADMIN') {
    const admin = await prisma.user.findUnique({ where: { id: user.userId } })
    if (admin?.villageId) where.villageId = admin.villageId
  }

  const farms = await prisma.farm.findMany({
    where,
    include: { plantType: true },
  })

  let notified = 0

  for (const farm of farms) {
    // Skip farms that are already harvested
    if (farm.cropStage === 'HARVESTED') continue

    const expected = calculateExpectedStage(farm.plantingDate, farm.plantType.growthDays)

    if (!isStageBehind(farm.cropStage, expected)) continue

    // Work out each lagging stage and notify once per pending transition
    // (only notify about the immediate NEXT stage, not all future ones)
    const nextStage = getNextStage(farm.cropStage)
    if (!nextStage) continue

    const notifTitle = `${STAGE_EMOJI[nextStage]} Saatnya Lanjut ke Tahap: ${STAGE_LABELS[nextStage]}`

    // Dedup: skip if an unread notification with this exact title already exists
    const existing = await prisma.notification.findFirst({
      where: {
        userId: farm.ownerId,
        title:  notifTitle,
        isRead: false,
      },
    })
    if (existing) continue

    const stageIdx  = STAGES.indexOf(nextStage)
    const stageNum  = stageIdx + 1

    await prisma.notification.create({
      data: {
        userId:  farm.ownerId,
        title:   notifTitle,
        message: `Kebun "${farm.name}" sudah waktunya masuk ke Tahap ${stageNum} — ${STAGE_LABELS[nextStage]}. Buka halaman kebun untuk konfirmasi dan perbarui tahap pertumbuhan.`,
        type:    'SYSTEM',
      },
    })

    notified++
  }

  return NextResponse.json({ checked: farms.length, notified })
}
