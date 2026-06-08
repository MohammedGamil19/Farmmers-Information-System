export const STAGES = [
  'SEEDLING',
  'VEGETATIVE',
  'GROWING',
  'READY_FOR_HARVEST',
  'HARVESTED',
] as const

export type CropStage = typeof STAGES[number]

export const STAGE_LABELS: Record<CropStage, string> = {
  SEEDLING:          'Pembibitan',
  VEGETATIVE:        'Vegetatif',
  GROWING:           'Pertumbuhan',
  READY_FOR_HARVEST: 'Siap Panen',
  HARVESTED:         'Sudah Dipanen',
}

export const STAGE_EMOJI: Record<CropStage, string> = {
  SEEDLING:          '🌱',
  VEGETATIVE:        '🌿',
  GROWING:           '🪴',
  READY_FOR_HARVEST: '🌾',
  HARVESTED:         '✅',
}

/**
 * Thresholds as a fraction of total growthDays.
 * Index maps to STAGES index (0 = SEEDLING, 4 = HARVESTED).
 */
const THRESHOLDS = [0, 0.20, 0.40, 0.75, 1.0]

/**
 * Calculate the expected crop stage based on days since planting.
 */
export function calculateExpectedStage(
  plantingDate: Date | string,
  growthDays: number,
): CropStage {
  const days = Math.floor(
    (Date.now() - new Date(plantingDate).getTime()) / (1000 * 60 * 60 * 24),
  )

  if (days < 0) return 'SEEDLING'

  // Walk thresholds from the end; return highest stage whose threshold is met
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (days >= Math.floor(growthDays * THRESHOLDS[i])) {
      return STAGES[Math.min(i, STAGES.length - 1)]
    }
  }

  return 'SEEDLING'
}

/**
 * Days since planting (can be negative if planting is in the future).
 */
export function daysSincePlanting(plantingDate: Date | string): number {
  return Math.floor(
    (Date.now() - new Date(plantingDate).getTime()) / (1000 * 60 * 60 * 24),
  )
}

/**
 * Get the next stage after the given one, or null if already at the last.
 */
export function getNextStage(stage: string): CropStage | null {
  const idx = STAGES.indexOf(stage as CropStage)
  if (idx === -1 || idx >= STAGES.length - 1) return null
  return STAGES[idx + 1]
}

/**
 * Return true if expectedStage is ahead of currentStage.
 */
export function isStageBehind(current: string, expected: string): boolean {
  const ci = STAGES.indexOf(current  as CropStage)
  const ei = STAGES.indexOf(expected as CropStage)
  return ei > ci
}

/**
 * Day range string for a stage, e.g. "Hari 7–12".
 */
export function stageDayRange(stageIndex: number, growthDays: number): string {
  const from = Math.floor(growthDays * THRESHOLDS[stageIndex])
  const to   = stageIndex < THRESHOLDS.length - 1
    ? Math.floor(growthDays * THRESHOLDS[stageIndex + 1]) - 1
    : growthDays
  return `Hari ${from}–${to}`
}
