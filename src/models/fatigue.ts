import type {
  BaseTargets,
  DailyRecord,
  ExerciseRecord,
  FatigueParams,
  FatigueSnapshot,
  PushupRecord,
  RecommendationReason,
  SquatRecord,
  TomorrowPlan,
} from '../types'

export const ALPHA_P = 0.35
export const ALPHA_S = 0.40
export const ALPHA_U = 0.45
export const ALPHA_D = 0.35
export const ALPHA_DB = 0.40
export const MEDIAN_INITIAL = 0.9

const FATIGUE_SCALE = 2.2
const FATIGUE_HOLD_THRESHOLD = 0.85
export const SUCCESS_INCREASE_FACTOR = 1.05
export const STREAK_MODERATE_FACTOR = 1.03
const FAILURE_DECREASE_FACTOR = 0.9
const FAILURE_STREAK_DAYS = 3
const MEDIAN_WINDOW = 14
export const MISSED_DAY_DECAY_PER_DAY = 0.05
export const MAX_MISSED_DAY_DECAY = 0.30

function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizePerformance(actual: number, target: number): number {
  return clip(actual / Math.max(target, 1), 0, 1.5)
}

export function computeTargetIntensity(target: number, base: number): number {
  return Math.log(1 + (target / Math.max(base, 1)))
}

export function computeLoad(actual: number, target: number, base: number): number {
  const r_e = normalizePerformance(actual, target)
  const g_e = computeTargetIntensity(target, base)
  const over_e = Math.max(0, r_e - 1)
  const under_e = Math.max(0, 1 - r_e)
  return g_e * (1 + 0.6 * over_e) * (1 + 0.3 * under_e)
}

export function computeRampPenalty(prevTarget: number, target: number): number {
  const d_e = clip((target - prevTarget) / Math.max(prevTarget, 1), -0.3, 0.3)
  return 1.2 * Math.max(0, d_e)
}

export function updateEWMA(alpha: number, prevFatigue: number, load: number): number {
  return alpha * load + (1 - alpha) * prevFatigue
}

export function computeSharedFatigueRaw(F_P: number, F_S: number, F_U: number, F_D: number, F_DB: number): number {
  return (
    0.18 * F_P
    + 0.23 * F_S
    + 0.23 * F_U
    + 0.18 * F_D
    + 0.18 * F_DB
    + 0.04 * F_P * F_D
    + 0.04 * F_S * F_U
    + 0.03 * F_P * F_S
    + 0.03 * F_P * F_U
    + 0.03 * F_S * F_D
    + 0.03 * F_U * F_D
    + 0.03 * F_P * F_DB
    + 0.03 * F_S * F_DB
    + 0.03 * F_U * F_DB
    + 0.02 * F_D * F_DB
  )
}

export function computeWeightFactor(weight_kg: number): number {
  return clip(1 + (0.10 * (weight_kg - 70)) / 70, 0.85, 1.20)
}

export function computeAgeFactor(age: number): number {
  return clip(1 + (0.08 * (age - 30)) / 30, 0.85, 1.25)
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function computeFatigueScore(F_total_adj: number, medianThreshold: number): number {
  return sigmoid(FATIGUE_SCALE * (F_total_adj - medianThreshold))
}

export function median(values: number[]): number {
  if (values.length === 0) return MEDIAN_INITIAL
  const sorted = values.toSorted((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? MEDIAN_INITIAL
  }
  const left = sorted[middle - 1] ?? MEDIAN_INITIAL
  const right = sorted[middle] ?? MEDIAN_INITIAL
  return (left + right) / 2
}

function sortByDateAscending(records: DailyRecord[]): DailyRecord[] {
  return records.toSorted((a, b) => a.date.localeCompare(b.date))
}

function getRecentMedian(adjustedHistory: number[]): number {
  if (adjustedHistory.length === 0) return MEDIAN_INITIAL
  return median(adjustedHistory.slice(-MEDIAN_WINDOW))
}

const NEUTRAL_PUSHUP: PushupRecord = { target_reps: 15, actual_reps: 15, success: true }
const NEUTRAL_DEADHANG: ExerciseRecord = { target_sec: 30, actual_sec: 30, success: true }

export function computeConsecutiveDays(records: DailyRecord[], currentDate: string): number {
  const filtered = records
    .filter((r) => r.date <= currentDate)
    .toSorted((a, b) => b.date.localeCompare(a.date))

  let count = 0
  let expectedDate = currentDate

  for (const record of filtered) {
    if (record.date !== expectedDate) break
    count++
    // Compute the previous day
    const [y, m, d] = expectedDate.split('-').map(Number)
    const prev = new Date(Date.UTC(y, m - 1, d - 1))
    expectedDate = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`
  }

  return count
}

export function computeFatigueSeries(
  records: DailyRecord[],
  params: FatigueParams,
  baseTargets: BaseTargets,
): FatigueSnapshot[] {
  const sorted = sortByDateAscending(records)
  const snapshots: FatigueSnapshot[] = []

  let F_P = 0
  let F_S = 0
  let F_U = 0
  let F_D = 0
  let F_DB = 0
  let previous: DailyRecord | null = null
  const adjustedHistory: number[] = []
  const weightFactor = computeWeightFactor(params.weight_kg)
  const ageFactor = computeAgeFactor(params.age)

  for (const record of sorted) {
    // Decay EWMA for each gap day (rest day = load 0 → F *= (1-alpha)^gap)
    if (previous) {
      const gap = computeMissedDays(previous.date, record.date)
      F_P *= (1 - ALPHA_P) ** gap
      F_S *= (1 - ALPHA_S) ** gap
      F_U *= (1 - ALPHA_U) ** gap
      F_D *= (1 - ALPHA_D) ** gap
      F_DB *= (1 - ALPHA_DB) ** gap
    }

    const pushup = record.pushup ?? NEUTRAL_PUSHUP
    const deadhang = record.deadhang ?? NEUTRAL_DEADHANG
    const dumbbell = record.dumbbell

    const plankLoad = computeLoad(record.plank.actual_sec, record.plank.target_sec, baseTargets.base_P)
    const squatLoad = computeLoad(record.squat.actual_reps, record.squat.target_reps, baseTargets.base_S)
    const pushupLoad = computeLoad(pushup.actual_reps, pushup.target_reps, baseTargets.base_U)
    const deadhangLoad = computeLoad(deadhang.actual_sec, deadhang.target_sec, baseTargets.base_D)
    const dumbbellLoad = dumbbell ? computeLoad(dumbbell.actual_reps, dumbbell.target_reps, baseTargets.base_DB) : 0

    const plankRampPenalty = previous
      ? computeRampPenalty(previous.plank.target_sec, record.plank.target_sec)
      : 0
    const squatRampPenalty = previous
      ? computeRampPenalty(previous.squat.target_reps, record.squat.target_reps)
      : 0
    const pushupRampPenalty = previous
      ? computeRampPenalty((previous.pushup ?? { target_reps: 15 }).target_reps, pushup.target_reps)
      : 0
    const deadhangRampPenalty = previous
      ? computeRampPenalty((previous.deadhang ?? { target_sec: 30 }).target_sec, deadhang.target_sec)
      : 0
    const dumbbellRampPenalty = (previous && dumbbell)
      ? computeRampPenalty((previous.dumbbell ?? { target_reps: 10 }).target_reps, dumbbell.target_reps)
      : 0

    F_P = updateEWMA(ALPHA_P, F_P, plankLoad + plankRampPenalty)
    F_S = updateEWMA(ALPHA_S, F_S, squatLoad + squatRampPenalty)
    F_U = updateEWMA(ALPHA_U, F_U, pushupLoad + pushupRampPenalty)
    F_D = updateEWMA(ALPHA_D, F_D, deadhangLoad + deadhangRampPenalty)
    F_DB = updateEWMA(ALPHA_DB, F_DB, dumbbellLoad + dumbbellRampPenalty)

    const F_total_raw = computeSharedFatigueRaw(F_P, F_S, F_U, F_D, F_DB)
    const F_total_adj = F_total_raw * weightFactor * ageFactor
    const median_m = getRecentMedian(adjustedHistory)
    const fatigue = computeFatigueScore(F_total_adj, median_m)

    adjustedHistory.push(F_total_adj)
    snapshots.push({ F_P, F_S, F_U, F_D, F_DB, F_total_raw, F_total_adj, fatigue, median_m })
    previous = record
  }

  return snapshots
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = values.toSorted((a, b) => a - b)
  const rank = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower] ?? 0
  const lowerValue = sorted[lower] ?? 0
  const upperValue = sorted[upper] ?? 0
  const weight = rank - lower
  return lowerValue * (1 - weight) + upperValue * weight
}

function hasFailureStreak(records: DailyRecord[], exercise: 'plank' | 'squat' | 'pushup' | 'deadhang' | 'dumbbell'): boolean {
  if (records.length < FAILURE_STREAK_DAYS) return false
  const tail = sortByDateAscending(records).slice(-FAILURE_STREAK_DAYS)
  return tail.every((record) => {
    if (exercise === 'plank') return !record.plank.success
    if (exercise === 'squat') return !record.squat.success
    if (exercise === 'pushup') return !(record.pushup ?? { success: true }).success
    if (exercise === 'dumbbell') return record.dumbbell ? !record.dumbbell.success : false
    return !(record.deadhang ?? { success: true }).success
  })
}

export function computeMissedDays(lastRecordDate: string, targetDate: string): number {
  const [ly, lm, ld] = lastRecordDate.split('-').map(Number)
  const [ty, tm, td] = targetDate.split('-').map(Number)
  const lastMs = Date.UTC(ly, lm - 1, ld)
  const targetMs = Date.UTC(ty, tm - 1, td)
  const dayDiff = Math.round((targetMs - lastMs) / (1000 * 60 * 60 * 24))
  // 1 day gap is normal (consecutive days), so missed = gap - 1
  return Math.max(0, dayDiff - 1)
}

function computeNextTargetValue(
  lastTarget: number,
  fatigue: number,
  failureStreak: boolean,
  success: boolean,
  consecutiveDays: number,
  missedDays: number,
  baseTarget: number,
): { target: number, reason: RecommendationReason } {
  if (failureStreak) {
    return {
      target: Math.max(1, Math.round(lastTarget * FAILURE_DECREASE_FACTOR)),
      reason: 'failure_streak',
    }
  }

  if (missedDays > 0) {
    const decay = Math.min(missedDays * MISSED_DAY_DECAY_PER_DAY, MAX_MISSED_DAY_DECAY)
    return {
      target: Math.min(lastTarget, Math.max(baseTarget, Math.round(lastTarget * (1 - decay)))),
      reason: 'missed_day_decay',
    }
  }

  if (fatigue > FATIGUE_HOLD_THRESHOLD) {
    return { target: lastTarget, reason: 'high_fatigue_hold' }
  }

  if (!success) {
    return { target: lastTarget, reason: 'not_met_hold' }
  }

  if (consecutiveDays >= 7) {
    return {
      target: Math.max(1, Math.round(lastTarget * STREAK_MODERATE_FACTOR)),
      reason: 'streak_moderate',
    }
  }

  return {
    target: Math.max(1, Math.round(lastTarget * SUCCESS_INCREASE_FACTOR)),
    reason: 'success_progression',
  }
}

export function computeTomorrowPlan(
  records: DailyRecord[],
  params: FatigueParams,
  baseTargets: BaseTargets,
  targetDate?: string,
): TomorrowPlan {
  const emptyPlan: TomorrowPlan = {
    plank_target_sec: baseTargets.base_P,
    squat_target_reps: baseTargets.base_S,
    pushup_target_reps: baseTargets.base_U,
    deadhang_target_sec: baseTargets.base_D,
    dumbbell_target_reps: baseTargets.base_DB,
    plank_reason: 'success_progression',
    squat_reason: 'success_progression',
    pushup_reason: 'success_progression',
    deadhang_reason: 'success_progression',
    dumbbell_reason: 'success_progression',
    fatigue: 0,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    overload_warning: false,
  }

  if (records.length === 0) {
    return emptyPlan
  }

  const sorted = sortByDateAscending(records)
  const snapshots = computeFatigueSeries(sorted, params, baseTargets)
  const lastRecord = sorted.at(-1)
  const latest = snapshots.at(-1)

  if (!lastRecord || !latest) {
    return emptyPlan
  }

  const plankFailureStreak = hasFailureStreak(sorted, 'plank')
  const squatFailureStreak = hasFailureStreak(sorted, 'squat')
  const pushupFailureStreak = hasFailureStreak(sorted, 'pushup')
  const deadhangFailureStreak = hasFailureStreak(sorted, 'deadhang')
  const dumbbellFailureStreak = hasFailureStreak(sorted, 'dumbbell')

  const missedDays = targetDate ? computeMissedDays(lastRecord.date, targetDate) : 0
  const consecutiveDays = computeConsecutiveDays(sorted, lastRecord.date)

  const F_total_raw_history = snapshots.map((snapshot) => snapshot.F_total_raw)
  const previousThreshold = percentile(F_total_raw_history.slice(0, -1), 95)

  const lastPushup = lastRecord.pushup ?? { target_reps: baseTargets.base_U, actual_reps: baseTargets.base_U, success: true }
  const plankRecommendation = computeNextTargetValue(
    lastRecord.plank.target_sec,
    latest.fatigue,
    plankFailureStreak,
    lastRecord.plank.success,
    consecutiveDays,
    missedDays,
    baseTargets.base_P,
  )
  const squatRecommendation = computeNextTargetValue(
    lastRecord.squat.target_reps,
    latest.fatigue,
    squatFailureStreak,
    lastRecord.squat.success,
    consecutiveDays,
    missedDays,
    baseTargets.base_S,
  )
  const pushupRecommendation = computeNextTargetValue(
    lastPushup.target_reps,
    latest.fatigue,
    pushupFailureStreak,
    lastPushup.success,
    consecutiveDays,
    missedDays,
    baseTargets.base_U,
  )
  const lastDeadhang = lastRecord.deadhang ?? { target_sec: baseTargets.base_D, actual_sec: baseTargets.base_D, success: true }
  const deadhangRecommendation = computeNextTargetValue(
    lastDeadhang.target_sec,
    latest.fatigue,
    deadhangFailureStreak,
    lastDeadhang.success,
    consecutiveDays,
    missedDays,
    baseTargets.base_D,
  )
  const lastDumbbell = lastRecord.dumbbell ?? { target_reps: baseTargets.base_DB, actual_reps: 0, success: false }
  const dumbbellRecommendation = computeNextTargetValue(
    lastDumbbell.target_reps,
    latest.fatigue,
    dumbbellFailureStreak,
    lastDumbbell.success,
    consecutiveDays,
    missedDays,
    baseTargets.base_DB,
  )

  return {
    plank_target_sec: plankRecommendation.target,
    squat_target_reps: squatRecommendation.target,
    pushup_target_reps: pushupRecommendation.target,
    deadhang_target_sec: deadhangRecommendation.target,
    dumbbell_target_reps: dumbbellRecommendation.target,
    plank_reason: plankRecommendation.reason,
    squat_reason: squatRecommendation.reason,
    pushup_reason: pushupRecommendation.reason,
    deadhang_reason: deadhangRecommendation.reason,
    dumbbell_reason: dumbbellRecommendation.reason,
    fatigue: latest.fatigue,
    F_P: latest.F_P,
    F_S: latest.F_S,
    F_U: latest.F_U,
    F_D: latest.F_D,
    F_DB: latest.F_DB,
    F_total_raw: latest.F_total_raw,
    overload_warning: F_total_raw_history.length > 1 && latest.F_total_raw > previousThreshold,
  }
}

export function computeLatestFatigueSnapshot(
  records: DailyRecord[],
  params: FatigueParams,
  baseTargets: BaseTargets,
): FatigueSnapshot {
  const latest = computeFatigueSeries(records, params, baseTargets).at(-1)
  if (latest) return latest
  return {
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    F_total_adj: 0,
    fatigue: 0,
    median_m: MEDIAN_INITIAL,
  }
}

// Compatibility wrappers used by existing API call sites.
export function computeNextTarget(
  baseTarget: number,
  history: ExerciseRecord[],
  params: FatigueParams,
  _floor?: number,
  _ceiling?: number,
): number {
  const synthetic: DailyRecord[] = history.map((record, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    plank: record,
    squat: {
      target_reps: 20,
      actual_reps: 20,
      success: true,
    },
    pushup: {
      target_reps: 15,
      actual_reps: 15,
      success: true,
    },
    deadhang: {
      target_sec: 30,
      actual_sec: 30,
      success: true,
    },
    dumbbell: {
      target_reps: 10,
      actual_reps: 10,
      success: true,
    },
    fatigue: 0,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    inactive_time_ratio: 0,
    flag_suspicious: false,
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
  }))

  return computeTomorrowPlan(synthetic, params, { base_P: baseTarget, base_S: 20, base_U: 15, base_D: 30, base_DB: 10 }).plank_target_sec
}

export function computeSquatTarget(
  baseTarget: number,
  history: SquatRecord[],
  params: FatigueParams,
): number {
  const synthetic: DailyRecord[] = history.map((record, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    plank: {
      target_sec: 60,
      actual_sec: 60,
      success: true,
    },
    squat: record,
    pushup: {
      target_reps: 15,
      actual_reps: 15,
      success: true,
    },
    deadhang: {
      target_sec: 30,
      actual_sec: 30,
      success: true,
    },
    dumbbell: {
      target_reps: 10,
      actual_reps: 10,
      success: true,
    },
    fatigue: 0,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    inactive_time_ratio: 0,
    flag_suspicious: false,
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
  }))

  return computeTomorrowPlan(synthetic, params, { base_P: 60, base_S: baseTarget, base_U: 15, base_D: 30, base_DB: 10 }).squat_target_reps
}

export function computePushupTarget(
  baseTarget: number,
  history: PushupRecord[],
  params: FatigueParams,
): number {
  const synthetic: DailyRecord[] = history.map((record, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    plank: {
      target_sec: 60,
      actual_sec: 60,
      success: true,
    },
    squat: {
      target_reps: 20,
      actual_reps: 20,
      success: true,
    },
    pushup: record,
    deadhang: {
      target_sec: 30,
      actual_sec: 30,
      success: true,
    },
    dumbbell: {
      target_reps: 10,
      actual_reps: 10,
      success: true,
    },
    fatigue: 0,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    inactive_time_ratio: 0,
    flag_suspicious: false,
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
  }))

  return computeTomorrowPlan(synthetic, params, { base_P: 60, base_S: 20, base_U: baseTarget, base_D: 30, base_DB: 10 }).pushup_target_reps
}
