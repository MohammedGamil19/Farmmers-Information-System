/**
 * Returns the villageId for a VILLAGE_ADMIN user.
 * Uses a module-level Map as an in-process cache so repeated requests
 * within the same serverless instance don't re-query the DB.
 */
import { prisma } from './prisma'

const TTL_MS = 60_000 // re-check the DB at most once a minute per user
const cache = new Map<string, { villageId: string | null; at: number }>()

export async function getAdminVillageId(userId: string): Promise<string | null> {
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.villageId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { villageId: true },
  })
  const villageId = user?.villageId ?? null
  cache.set(userId, { villageId, at: Date.now() })
  return villageId
}
