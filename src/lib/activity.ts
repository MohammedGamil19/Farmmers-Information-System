import { prisma } from './prisma'

type LogInput = {
  userId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'Panen' | 'Anggota' | 'Lahan' | 'Kebun' | 'Pengguna'
  detail: string
  villageId?: string | null
}

/**
 * Records an activity-log entry. Best-effort: never throws, so a logging
 * failure can't break the underlying operation.
 */
export async function logActivity(input: LogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        detail: input.detail,
        villageId: input.villageId ?? null,
      },
    })
  } catch {
    // swallow — logging must never interrupt the main flow
  }
}
