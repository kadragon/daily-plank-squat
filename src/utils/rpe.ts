export const NEUTRAL_RPE = 5
const MIN_RPE = 1
const MAX_RPE = 10

export function normalizeRpe(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NEUTRAL_RPE
  const integer = Math.floor(value)
  if (integer < MIN_RPE || integer > MAX_RPE) return NEUTRAL_RPE
  return integer
}
