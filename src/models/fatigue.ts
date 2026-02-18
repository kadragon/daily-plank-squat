import type { ExerciseRecord, SquatRecord, FatigueParams } from '../types'

export function normalizePerformance(actual: number, target: number): number {
  if (target === 0) return 0
  return Math.min(1.5, Math.max(0, actual / target))
}

const SIGMOID_K = 5
export const MEDIAN_THRESHOLD = 0.5

export function computeFatigueScore(F_total: number): number {
  return 1 / (1 + Math.exp(-SIGMOID_K * (F_total - MEDIAN_THRESHOLD)))
}

export function computeFTotal(F_P: number, F_S: number, params: FatigueParams): number {
  const weight_factor = params.weight / 70
  const age_factor = 1 + Math.max(0, params.age - 30) * 0.01
  return (F_P * weight_factor + F_S) * age_factor / 2
}

export const ALPHA_P = 0.35
export const ALPHA_S = 0.40

export function updateEWMA(alpha: number, prevFatigue: number, load: number): number {
  return alpha * load + (1 - alpha) * prevFatigue
}

const MAX_RAMP = 0.3

export function computeRampStress(prevLoad: number, curLoad: number): number {
  const delta = curLoad - prevLoad
  return Math.min(MAX_RAMP, Math.max(-MAX_RAMP, delta))
}

const OVER_PENALTY = 0.5
const UNDER_PENALTY = 0.2

export function computeLoad(r_e: number): number {
  if (r_e >= 1) return r_e + OVER_PENALTY * (r_e - 1)
  return r_e + UNDER_PENALTY * (1 - r_e)
}

function clamp(value: number, floor?: number, ceiling?: number): number {
  let result = value
  if (floor !== undefined) result = Math.max(floor, result)
  if (ceiling !== undefined) result = Math.min(ceiling, result)
  return result
}

export function computeNextTarget(
  baseTarget: number,
  history: ExerciseRecord[],
  _params: FatigueParams,
  floor?: number,
  ceiling?: number,
): number {
  if (history.length === 0) return baseTarget

  if (history.length >= 3 && history.slice(-3).every(r => !r.success)) {
    return clamp(Math.round(baseTarget * 0.9), floor, ceiling)
  }

  let F_P = 0
  for (const record of history) {
    const r_e = normalizePerformance(record.actual_sec, record.target_sec)
    F_P = updateEWMA(ALPHA_P, F_P, computeLoad(r_e))
  }

  const fatigueScore = computeFatigueScore(F_P)
  const next = fatigueScore > 0.85 ? baseTarget : Math.round(baseTarget * 1.05)
  return clamp(next, floor, ceiling)
}

export function computeSquatTarget(
  _baseTarget: number,
  _history: SquatRecord[],
  _params: FatigueParams,
): number {
  return _baseTarget
}
