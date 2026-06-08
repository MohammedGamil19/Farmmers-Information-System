/**
 * Returns the villageId for a VILLAGE_ADMIN user.
 * Uses a module-level Map as an in-process cache so repeated requests
 * within the same serverless instance don't re-query the DB.
 */
import { prisma } from './prisma'

const cache = new Map<string, string | null>()

export async function getAdminVillageId(userId: string): Promise<string | null> {
  if (cache.has(userId)) return cache.get(userId)!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { villageId: true },
  })
  const villageId = user?.villageId ?? null
  cache.set(userId, villageId)
  return villageId
}
