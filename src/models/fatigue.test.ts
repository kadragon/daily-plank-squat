import { expect, test } from 'bun:test'
import type { BaseTargets, DailyRecord, FatigueParams } from '../types'
import {
  ALPHA_D,
  ALPHA_P,
  ALPHA_S,
  ALPHA_U,
  MEDIAN_INITIAL,
  RECOVERY_LOAD_FACTOR,
  TRAINING_DAYS_BEFORE_RECOVERY,
  TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER,
  computeAgeFactor,
  computeConsecutiveDays,
  computeDayType,
  computeFatigueScore,
  computeFatigueSeries,
  computeLoad,
  computeMissedDays,
  computeNextTarget,
  computePushupTarget,
  computeRampPenalty,
  computeSharedFatigueRaw,
  computeSquatTarget,
  computeTargetIntensity,
  computeTomorrowPlan,
  computeWeightFactor,
  median,
  normalizePerformance,
  percentile,
  updateEWMA,
} from './fatigue'

const params: FatigueParams = {
  age: 30,
  weight_kg: 70,
  gender: 'other',
}

const baseTargets: BaseTargets = {
  base_P: 60,
  base_S: 20,
  base_U: 15,
  base_D: 30,
  base_DB: 10,
}

function dailyRecord(
  date: string,
  plankTarget: number,
  plankActual: number,
  plankSuccess: boolean,
  squatTarget: number,
  squatActual: number,
  squatSuccess: boolean,
): DailyRecord {
  return {
    date,
    plank: {
      target_sec: plankTarget,
      actual_sec: plankActual,
      success: plankSuccess,
    },
    squat: {
      target_reps: squatTarget,
      actual_reps: squatActual,
      success: squatSuccess,
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
  }
}

test('computes normalized performance ratio r_e clipped to [0, 1.5]', () => {
  expect(normalizePerformance(30, 60)).toBeCloseTo(0.5)
  expect(normalizePerformance(90, 60)).toBeCloseTo(1.5)
  expect(normalizePerformance(120, 60)).toBeCloseTo(1.5)
  expect(normalizePerformance(0, 60)).toBeCloseTo(0)
})

test('computes target intensity g_e = ln(1 + target/base)', () => {
  expect(computeTargetIntensity(60, 60)).toBeCloseTo(Math.log(2))
  expect(computeTargetIntensity(120, 60)).toBeCloseTo(Math.log(3))
})

test('computes load with PRD over/under multipliers', () => {
  const atTarget = computeLoad(60, 60, 60)
  const overTarget = computeLoad(90, 60, 60)
  const underTarget = computeLoad(30, 60, 60)

  expect(atTarget).toBeCloseTo(Math.log(2))
  expect(overTarget).toBeCloseTo(Math.log(2) * (1 + 0.6 * 0.5))
  expect(underTarget).toBeCloseTo(Math.log(2) * (1 + 0.3 * 0.5))
})

test('computes ramp penalty from clipped positive ramp only', () => {
  expect(computeRampPenalty(100, 140)).toBeCloseTo(1.2 * 0.3)
  expect(computeRampPenalty(100, 50)).toBeCloseTo(0)
})

test('computes EWMA fatigue per exercise with alpha_P=0.35 and alpha_S=0.40', () => {
  expect(ALPHA_P).toBeCloseTo(0.35)
  expect(ALPHA_S).toBeCloseTo(0.40)
  expect(updateEWMA(ALPHA_P, 0, 1.0)).toBeCloseTo(0.35)
  expect(updateEWMA(ALPHA_S, 0, 1.0)).toBeCloseTo(0.40)
})

test('ALPHA_U constant equals 0.45', () => {
  expect(ALPHA_U).toBeCloseTo(0.45)
  expect(updateEWMA(ALPHA_U, 0, 1.0)).toBeCloseTo(0.45)
})

test('ALPHA_D constant equals 0.35', () => {
  expect(ALPHA_D).toBeCloseTo(0.35)
  expect(updateEWMA(ALPHA_D, 0, 1.0)).toBeCloseTo(0.35)
})

test('computeSharedFatigueRaw(F_P, F_S, F_U, F_D, F_DB) returns 5-exercise weighted formula', () => {
  const allOnes = 0.18 + 0.23 + 0.23 + 0.18 + 0.18
    + 0.04 + 0.04 + 0.03 + 0.03 + 0.03 + 0.03 + 0.03 + 0.03 + 0.03 + 0.02
  expect(computeSharedFatigueRaw(1.0, 1.0, 1.0, 1.0, 1.0)).toBeCloseTo(allOnes)
  const expected = (
    0.18 * 0.5
    + 0.23 * 1.0
    + 0.23 * 0
    + 0.18 * 0.2
    + 0.18 * 0.3
    + 0.04 * 0.5 * 0.2
    + 0.04 * 1.0 * 0
    + 0.03 * 0.5 * 1.0
    + 0.03 * 0.5 * 0
    + 0.03 * 1.0 * 0.2
    + 0.03 * 0 * 0.2
    + 0.03 * 0.5 * 0.3
    + 0.03 * 1.0 * 0.3
    + 0.03 * 0 * 0.3
    + 0.02 * 0.2 * 0.3
  )
  expect(computeSharedFatigueRaw(0.5, 1.0, 0, 0.2, 0.3)).toBeCloseTo(expected)
})

test('computes clipped body factors from PRD', () => {
  expect(computeWeightFactor(70)).toBeCloseTo(1)
  expect(computeWeightFactor(140)).toBeCloseTo(1.1)
  expect(computeWeightFactor(-1000)).toBeCloseTo(0.85)

  expect(computeAgeFactor(30)).toBeCloseTo(1)
  expect(computeAgeFactor(60)).toBeCloseTo(1.08)
  expect(computeAgeFactor(999)).toBeCloseTo(1.25)
})

test('computes sigmoid fatigue score with median threshold m', () => {
  expect(computeFatigueScore(0.9, 0.9)).toBeCloseTo(0.5)
  expect(computeFatigueScore(2.0, 0.9)).toBeGreaterThan(0.5)
  expect(computeFatigueScore(0.2, 0.9)).toBeLessThan(0.5)
})

test('uses rolling median with initial default 0.9', () => {
  expect(median([])).toBeCloseTo(MEDIAN_INITIAL)
  expect(median([1, 5, 3])).toBe(3)
  expect(median([1, 3, 5, 7])).toBe(4)
})

test('computes fatigue series for both plank and squat dimensions', () => {
  const records: DailyRecord[] = [
    dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-17', 65, 62, true, 21, 19, false),
  ]

  const series = computeFatigueSeries(records, params, baseTargets)
  expect(series).toHaveLength(2)
  expect(series[1]?.F_P ?? 0).toBeGreaterThan(0)
  expect(series[1]?.F_S ?? 0).toBeGreaterThan(0)
})

test('computeFatigueSeries decays EWMA during gap days', () => {
  const consecutive: DailyRecord[] = [
    dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-17', 60, 60, true, 20, 20, true),
  ]
  const withGap: DailyRecord[] = [
    dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-20', 60, 60, true, 20, 20, true), // 3 gap days
  ]

  const consecutiveSeries = computeFatigueSeries(consecutive, params, baseTargets)
  const gapSeries = computeFatigueSeries(withGap, params, baseTargets)

  // After gap days, EWMA decays before the second record is processed,
  // so the fatigue at record 2 should be lower with a gap
  expect(gapSeries[1]?.F_P).toBeLessThan(consecutiveSeries[1]?.F_P)
  expect(gapSeries[1]?.F_S).toBeLessThan(consecutiveSeries[1]?.F_S)
})

test('computeFatigueSeries computes F_U via pushup EWMA', () => {
  const records: DailyRecord[] = [
    {
      ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 15, success: true },
    },
    {
      ...dailyRecord('2026-02-17', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 15, success: true },
    },
  ]

  const series = computeFatigueSeries(records, params, baseTargets)
  expect(series).toHaveLength(2)
  expect(series[0]?.F_U ?? 0).toBeGreaterThan(0)
  expect(series[1]?.F_U ?? 0).toBeGreaterThan(0)
})

test('returns base targets when there is no history', () => {
  const plan = computeTomorrowPlan([], params, baseTargets)
  expect(plan.plank_target_sec).toBe(60)
  expect(plan.squat_target_reps).toBe(20)
  expect(plan.pushup_target_reps).toBe(15)
  expect(plan.deadhang_target_sec).toBe(30)
})

test('increases targets when success=true and fatigue is low', () => {
  const plan = computeTomorrowPlan(
    [dailyRecord('2026-02-16', 60, 60, true, 20, 20, true)],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBeGreaterThan(60)
  expect(plan.squat_target_reps).toBeGreaterThan(20)
})

test('computeTomorrowPlan increases pushup target when success=true and fatigue low', () => {
  const record: DailyRecord = {
    ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    pushup: { target_reps: 15, actual_reps: 15, success: true },
  }
  const plan = computeTomorrowPlan([record], params, baseTargets)
  expect(plan.pushup_target_reps).toBeGreaterThan(15)
})

test('computeTomorrowPlan increases deadhang target when success=true and fatigue low', () => {
  const record: DailyRecord = {
    ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    deadhang: { target_sec: 30, actual_sec: 30, success: true },
  }
  const plan = computeTomorrowPlan([record], params, baseTargets)
  expect(plan.deadhang_target_sec).toBeGreaterThan(30)
})

test('holds both targets when fatigue is above threshold 0.85', () => {
  const plan = computeTomorrowPlan(
    [
      dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
    ],
    params,
    baseTargets,
  )

  expect(plan.fatigue).toBeGreaterThan(0.85)
  expect(plan.plank_target_sec).toBe(800)
  expect(plan.squat_target_reps).toBe(300)
})

test('computeTomorrowPlan holds pushup target when fatigue > 0.85', () => {
  const records: DailyRecord[] = [
    {
      ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 30, success: true },
    },
    {
      ...dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
      pushup: { target_reps: 100, actual_reps: 200, success: true },
    },
  ]
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.fatigue).toBeGreaterThan(0.85)
  expect(plan.pushup_target_reps).toBe(100)
})

test('computeTomorrowPlan holds deadhang target when fatigue > 0.85', () => {
  const records: DailyRecord[] = [
    {
      ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      deadhang: { target_sec: 30, actual_sec: 60, success: true },
    },
    {
      ...dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
      deadhang: { target_sec: 300, actual_sec: 450, success: true },
    },
  ]
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.fatigue).toBeGreaterThan(0.85)
  expect(plan.deadhang_target_sec).toBe(300)
})

test('decreases targets by 10% after 3-day failure streak per exercise', () => {
  const plan = computeTomorrowPlan(
    [
      dailyRecord('2026-02-14', 60, 20, false, 20, 8, false),
      dailyRecord('2026-02-15', 60, 20, false, 20, 8, false),
      dailyRecord('2026-02-16', 60, 20, false, 20, 8, false),
    ],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(54)
  expect(plan.squat_target_reps).toBe(18)
})

test('hasFailureStreak detects pushup 3-day failure streak', () => {
  const records: DailyRecord[] = [
    {
      ...dailyRecord('2026-02-14', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 5, success: false },
    },
    {
      ...dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 5, success: false },
    },
    {
      ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 5, success: false },
    },
  ]
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.pushup_target_reps).toBe(14) // 15 * 0.9 = 13.5 → 14
})

test('computeTomorrowPlan decreases pushup target after failure streak', () => {
  const records: DailyRecord[] = Array.from({ length: 3 }, (_, i) => ({
    ...dailyRecord(`2026-02-${14 + i}`, 60, 60, true, 20, 20, true),
    pushup: { target_reps: 20, actual_reps: 5, success: false },
  }))
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.pushup_target_reps).toBe(18) // 20 * 0.9 = 18
})

test('hasFailureStreak detects deadhang 3-day failure streak', () => {
  const records: DailyRecord[] = Array.from({ length: 3 }, (_, i) => ({
    ...dailyRecord(`2026-02-${14 + i}`, 60, 60, true, 20, 20, true),
    deadhang: { target_sec: 30, actual_sec: 10, success: false },
  }))
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.deadhang_target_sec).toBe(27) // 30 * 0.9 = 27
})

test('sets overload warning when latest F_total_raw is above historical 95th percentile', () => {
  const plan = computeTomorrowPlan(
    [
      dailyRecord('2026-02-14', 60, 60, true, 20, 20, true),
      dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
      dailyRecord('2026-02-16', 200, 300, true, 80, 120, true),
    ],
    params,
    baseTargets,
  )

  expect(plan.overload_warning).toBe(true)
})

test('percentile returns interpolated percentile values', () => {
  expect(percentile([1, 2, 3, 4], 95)).toBeCloseTo(3.85)
})

test('compatibility wrappers still compute next targets', () => {
  const plankTarget = computeNextTarget(60, [{ target_sec: 60, actual_sec: 60, success: true }], params)
  const squatTarget = computeSquatTarget(20, [{ target_reps: 20, actual_reps: 20, success: true }], params)

  expect(plankTarget).toBeGreaterThan(60)
  expect(squatTarget).toBeGreaterThan(20)
})

test('computePushupTarget compatibility wrapper computes next pushup target', () => {
  const pushupTarget = computePushupTarget(15, [{ target_reps: 15, actual_reps: 15, success: true }], params)
  expect(pushupTarget).toBeGreaterThan(15)
})

test('computeTomorrowPlan applies success_progression (+5%) for successful exercise (non-beginner)', () => {
  // Setup: 21 records total so isBeginnerPhase=false (BEGINNER_DAYS=21 → 21 < 21 = false).
  // Use a gap (Jan18 missing) so consecutive habit streak = 4 (Jan19-Jan22) < 7 → success_progression.
  // Also 4 consecutive training days < TRAINING_DAYS_BEFORE_RECOVERY=5 → training day (no recovery).
  const base = Array.from({ length: 17 }, (_, i) => ({
    ...dailyRecord(`2026-01-${String(i + 1).padStart(2, '0')}`, 100, 100, true, 20, 20, true),
    plank: { target_sec: 100, actual_sec: 100, success: true },
    squat: { target_reps: 20, actual_reps: 20, success: true },
    pushup: { target_reps: 20, actual_reps: 20, success: true },
  }))
  const tail = Array.from({ length: 4 }, (_, i) => ({
    ...dailyRecord(`2026-01-${String(19 + i).padStart(2, '0')}`, 100, 100, true, 20, 20, true),
    plank: { target_sec: 100, actual_sec: 100, success: true },
    squat: { target_reps: 20, actual_reps: 20, success: true },
    pushup: { target_reps: 20, actual_reps: 20, success: true },
  }))
  const records = [...base, ...tail] // 17 + 4 = 21 records, gap at Jan18
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-01-23')

  expect(plan.plank_target_sec).toBe(105)
  expect(plan.squat_target_reps).toBe(21)
  expect(plan.pushup_target_reps).toBe(21)
  expect(plan.plank_reason).toBe('success_progression')
  expect(plan.squat_reason).toBe('success_progression')
  expect(plan.pushup_reason).toBe('success_progression')
})

test('computeTomorrowPlan applies beginner_ramp (+3%) for new users (beginner phase)', () => {
  // Single record — in beginner phase (BEGINNER_DAYS=21)
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true },
      squat: { target_reps: 20, actual_reps: 20, success: true },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(103) // 100 * 1.03
  expect(plan.squat_target_reps).toBe(21) // 20 * 1.03 = 20.6 → 21
  expect(plan.plank_reason).toBe('beginner_ramp')
  expect(plan.squat_reason).toBe('beginner_ramp')
})

test('computeTomorrowPlan holds target for unsuccessful exercise (not_met_hold)', () => {
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 50, false, 20, 10, false),
      plank: { target_sec: 100, actual_sec: 50, success: false },
      squat: { target_reps: 20, actual_reps: 10, success: false },
      pushup: { target_reps: 20, actual_reps: 10, success: false },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(100)
  expect(plan.squat_target_reps).toBe(20)
  expect(plan.pushup_target_reps).toBe(20)
  expect(plan.plank_reason).toBe('not_met_hold')
  expect(plan.squat_reason).toBe('not_met_hold')
  expect(plan.pushup_reason).toBe('not_met_hold')
})

test('computeTomorrowPlan applies streak_moderate (+3%) for 7+ consecutive days (non-beginner, after recovery reset)', () => {
  // Setup: 21+ records → non-beginner. After the recovery day, only 4 consecutive training days
  // (< TRAINING_DAYS_BEFORE_RECOVERY=5) → training day. But habit streak (all records including
  // the recovery day) counts 21 days → >= 7 → streak_moderate.
  // Records: Jan1-Jan17 (17 training) + Jan18 (recovery) + Jan19-Jan22 (4 training) = 22 records.
  const base = Array.from({ length: 17 }, (_, i) => ({
    ...dailyRecord(`2026-01-${String(i + 1).padStart(2, '0')}`, 100, 100, true, 20, 20, true),
    pushup: { target_reps: 20, actual_reps: 20, success: true },
  }))
  const recoveryDay = {
    ...dailyRecord('2026-01-18', 50, 50, true, 10, 10, true),
    day_type: 'recovery' as const,
  }
  const tail = Array.from({ length: 4 }, (_, i) => ({
    ...dailyRecord(`2026-01-${String(19 + i).padStart(2, '0')}`, 100, 100, true, 20, 20, true),
    pushup: { target_reps: 20, actual_reps: 20, success: true },
  }))
  const records = [...base, recoveryDay, ...tail] // 22 records
  // Target Jan23: last 4 consecutive training days (Jan19-Jan22) < threshold=5 → training day.
  // Habit streak: Jan1-Jan22 all have records (22 consecutive) >= 7 → streak_moderate.
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-01-23')

  expect(plan.plank_target_sec).toBe(103) // 100 * 1.03
  expect(plan.squat_target_reps).toBe(21) // 20 * 1.03 = 20.6 → 21
  expect(plan.plank_reason).toBe('streak_moderate')
  expect(plan.squat_reason).toBe('streak_moderate')
})

test('failure streak has priority over success_progression', () => {
  const records: DailyRecord[] = Array.from({ length: 3 }, (_, i) => ({
    ...dailyRecord(`2026-02-${14 + i}`, 100, 20, false, 20, 8, false),
    plank: { target_sec: 100, actual_sec: 20, success: false },
    squat: { target_reps: 20, actual_reps: 8, success: false },
    pushup: { target_reps: 20, actual_reps: 5, success: false },
  }))
  const plan = computeTomorrowPlan(records, params, baseTargets)

  expect(plan.plank_target_sec).toBe(90)
  expect(plan.squat_target_reps).toBe(18)
  expect(plan.pushup_target_reps).toBe(18)
})

test('fatigue hold has priority over success_progression', () => {
  const plan = computeTomorrowPlan(
    [
      {
        ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
        plank: { target_sec: 60, actual_sec: 60, success: true },
        squat: { target_reps: 20, actual_reps: 20, success: true },
        pushup: { target_reps: 15, actual_reps: 30, success: true },
      },
      {
        ...dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
        plank: { target_sec: 800, actual_sec: 1200, success: true },
        squat: { target_reps: 300, actual_reps: 450, success: true },
        pushup: { target_reps: 100, actual_reps: 200, success: true },
      },
    ],
    params,
    baseTargets,
  )

  expect(plan.fatigue).toBeGreaterThan(0.85)
  expect(plan.plank_target_sec).toBe(800)
  expect(plan.squat_target_reps).toBe(300)
  expect(plan.pushup_target_reps).toBe(100)
})

test('computeTomorrowPlan returns beginner_ramp reason codes for new users', () => {
  // Single record → beginner phase (< BEGINNER_DAYS=21) → reason = 'beginner_ramp'
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true },
      squat: { target_reps: 20, actual_reps: 20, success: true },
      pushup: { target_reps: 20, actual_reps: 20, success: true },
      deadhang: { target_sec: 30, actual_sec: 30, success: true },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_reason).toBe('beginner_ramp')
  expect(plan.squat_reason).toBe('beginner_ramp')
  expect(plan.pushup_reason).toBe('beginner_ramp')
  expect(plan.deadhang_reason).toBe('beginner_ramp')
})

test('computeMissedDays returns 0 for consecutive days', () => {
  expect(computeMissedDays('2026-02-16', '2026-02-17')).toBe(0)
})

test('computeMissedDays returns correct gap for skipped days', () => {
  expect(computeMissedDays('2026-02-16', '2026-02-18')).toBe(1)
  expect(computeMissedDays('2026-02-16', '2026-02-20')).toBe(3)
  expect(computeMissedDays('2026-02-16', '2026-02-23')).toBe(6)
})

test('computeMissedDays returns 0 when targetDate is before or same as lastDate', () => {
  expect(computeMissedDays('2026-02-16', '2026-02-16')).toBe(0)
  expect(computeMissedDays('2026-02-16', '2026-02-14')).toBe(0)
})

test('computeTomorrowPlan reduces targets by 5% per missed day', () => {
  const records = [
    {
      ...dailyRecord('2026-02-16', 100, 100, true, 40, 40, true),
      pushup: { target_reps: 30, actual_reps: 30, success: true },
      deadhang: { target_sec: 40, actual_sec: 40, success: true },
    },
  ]
  // 2 missed days (Feb 17, 18 skipped, target is Feb 19)
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-02-19')

  // 2 missed days = 10% decay
  expect(plan.plank_target_sec).toBe(90)   // 100 * 0.9
  expect(plan.squat_target_reps).toBe(36)  // 40 * 0.9
  expect(plan.pushup_target_reps).toBe(27) // 30 * 0.9
  expect(plan.deadhang_target_sec).toBe(36) // 40 * 0.9
  expect(plan.plank_reason).toBe('missed_day_decay')
  expect(plan.squat_reason).toBe('missed_day_decay')
  expect(plan.pushup_reason).toBe('missed_day_decay')
  expect(plan.deadhang_reason).toBe('missed_day_decay')
})

test('missed day decay caps at 30%', () => {
  const records = [dailyRecord('2026-02-01', 100, 100, true, 40, 40, true)]
  // 10 missed days → capped at 30%
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-02-12')

  expect(plan.plank_target_sec).toBe(70) // 100 * 0.7
  expect(plan.squat_target_reps).toBe(28) // 40 * 0.7
})

test('missed day decay does not reduce below base target', () => {
  // squat target = 22 (just above base 20), 6 missed days → 30% decay → 22*0.7=15.4 → floored to 20
  const records = [dailyRecord('2026-02-01', 65, 65, true, 22, 22, true)]
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-02-08')

  expect(plan.squat_target_reps).toBe(20) // floored at base_S=20
  expect(plan.plank_target_sec).toBe(60)  // 65*0.7=45.5 → floored at base_P=60
  expect(plan.squat_reason).toBe('missed_day_decay')
})

test('no missed day decay when consecutive days (beginner_ramp applies)', () => {
  const records = [dailyRecord('2026-02-16', 100, 100, true, 20, 20, true)]
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-02-17')

  // Single record → beginner phase (+3%), no missed day decay
  expect(plan.plank_target_sec).toBe(103) // 100 * 1.03
  expect(plan.squat_target_reps).toBe(21) // 20 * 1.03 = 20.6 → 21
  expect(plan.plank_reason).toBe('beginner_ramp')
})

test('no missed day decay when targetDate is not provided (beginner_ramp applies)', () => {
  const records = [dailyRecord('2026-02-16', 100, 100, true, 20, 20, true)]
  const plan = computeTomorrowPlan(records, params, baseTargets)

  // Single record → beginner phase (+3%)
  expect(plan.plank_target_sec).toBe(103)
  expect(plan.squat_target_reps).toBe(21)
})

test('computeTomorrowPlan reduces target by 5% for exactly 1 missed day', () => {
  const records = [
    {
      ...dailyRecord('2026-02-16', 100, 100, true, 40, 40, true),
      pushup: { target_reps: 30, actual_reps: 30, success: true },
      deadhang: { target_sec: 40, actual_sec: 40, success: true },
    },
  ]
  // 1 missed day (Feb 17 skipped, target is Feb 18)
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-02-18')

  expect(plan.plank_target_sec).toBe(95)   // 100 * 0.95
  expect(plan.squat_target_reps).toBe(38)  // 40 * 0.95
  expect(plan.plank_reason).toBe('missed_day_decay')
})

test('missed day decay takes priority over high fatigue hold', () => {
  // Create records with rapidly increasing targets to push fatigue above 0.85.
  // Insert a recovery day every 4th day so the consecutive training count stays below
  // TRAINING_DAYS_BEFORE_RECOVERY=5, allowing fatigue to accumulate without triggering
  // a recovery day prescription.
  const records: DailyRecord[] = []
  for (let i = 0; i < 14; i++) {
    const day = String(i + 1).padStart(2, '0')
    const plankSec = 60 + i * 30  // rapidly increasing load
    const squatReps = 20 + i * 10
    const isRecovery = i > 0 && i % 4 === 0
    records.push({
      ...dailyRecord(`2026-02-${day}`, plankSec, plankSec, true, squatReps, squatReps, true),
      pushup: { target_reps: 15 + i * 8, actual_reps: 15 + i * 8, success: true },
      deadhang: { target_sec: 30 + i * 10, actual_sec: 30 + i * 10, success: true },
      day_type: isRecovery ? 'recovery' : 'training',
    })
  }

  // Verify fatigue is high after the last training day
  // target Feb 15 = day after last record (Feb 14), gap=0, last streak of training < 5
  const basePlan = computeTomorrowPlan(records, params, baseTargets, '2026-02-15')
  expect(basePlan.fatigue).toBeGreaterThan(0.85)
  expect(basePlan.plank_reason).toBe('high_fatigue_hold')

  // Now with 3 missed days → missed_day_decay should win (gap breaks recovery)
  const decayPlan = computeTomorrowPlan(records, params, baseTargets, '2026-02-18')
  expect(decayPlan.plank_reason).toBe('missed_day_decay')
  expect(decayPlan.plank_target_sec).toBeLessThan(basePlan.plank_target_sec)
})

test('missed day decay does not raise target when lastTarget is below baseTarget', () => {
  const records = [
    dailyRecord('2026-02-14', 50, 10, false, 18, 5, false),
    dailyRecord('2026-02-15', 50, 10, false, 18, 5, false),
    dailyRecord('2026-02-16', 50, 10, false, 18, 5, false),
  ]
  // First verify failure_streak reduces squat below base
  const streakPlan = computeTomorrowPlan(records, params, baseTargets, '2026-02-17')
  expect(streakPlan.squat_reason).toBe('failure_streak')
  expect(streakPlan.squat_target_reps).toBeLessThan(baseTargets.base_S)

  // Now simulate: user worked out at the reduced target, then missed 2 days
  const afterStreak = [
    ...records,
    dailyRecord('2026-02-17', 50, 50, true, streakPlan.squat_target_reps, streakPlan.squat_target_reps, true),
  ]
  const decayPlan = computeTomorrowPlan(afterStreak, params, baseTargets, '2026-02-20')
  expect(decayPlan.squat_reason).toBe('missed_day_decay')
  // Should NOT raise above the last target
  const lastSquatTarget = afterStreak.at(-1)?.squat.target_reps ?? 0
  expect(decayPlan.squat_target_reps).toBeLessThanOrEqual(lastSquatTarget)
})

test('failure streak takes priority over missed day decay', () => {
  const records = [
    dailyRecord('2026-02-14', 100, 20, false, 20, 8, false),
    dailyRecord('2026-02-15', 100, 20, false, 20, 8, false),
    dailyRecord('2026-02-16', 100, 20, false, 20, 8, false),
  ]
  // 3 missed days + failure streak → failure streak wins
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-02-20')

  expect(plan.plank_target_sec).toBe(90) // failure_streak: 100 * 0.9
  expect(plan.plank_reason).toBe('failure_streak')
})

// computeConsecutiveDays tests

test('computeConsecutiveDays — empty array returns 0', () => {
  expect(computeConsecutiveDays([], '2026-02-16')).toBe(0)
})

test('computeConsecutiveDays — single record on currentDate returns 1', () => {
  const records = [dailyRecord('2026-02-16', 60, 60, true, 20, 20, true)]
  expect(computeConsecutiveDays(records, '2026-02-16')).toBe(1)
})

test('computeConsecutiveDays — 3 consecutive days returns 3', () => {
  const records = [
    dailyRecord('2026-02-14', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
  ]
  expect(computeConsecutiveDays(records, '2026-02-16')).toBe(3)
})

test('computeConsecutiveDays — gap in middle breaks streak', () => {
  const records = [
    dailyRecord('2026-02-13', 60, 60, true, 20, 20, true),
    // 2026-02-14 missing
    dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
  ]
  expect(computeConsecutiveDays(records, '2026-02-16')).toBe(2)
})

test('computeConsecutiveDays — records after currentDate are ignored', () => {
  const records = [
    dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-17', 60, 60, true, 20, 20, true),
  ]
  expect(computeConsecutiveDays(records, '2026-02-16')).toBe(2)
})

test('computeConsecutiveDays — no record on currentDate returns 0', () => {
  const records = [
    dailyRecord('2026-02-14', 60, 60, true, 20, 20, true),
    dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
  ]
  expect(computeConsecutiveDays(records, '2026-02-16')).toBe(0)
})

test('empty history default reason is success_progression', () => {
  const plan = computeTomorrowPlan([], params, baseTargets)
  expect(plan.plank_reason).toBe('success_progression')
  expect(plan.squat_reason).toBe('success_progression')
  expect(plan.pushup_reason).toBe('success_progression')
  expect(plan.deadhang_reason).toBe('success_progression')
  expect(plan.dumbbell_reason).toBe('success_progression')
})

// ─── Recovery day logic ──────────────────────────────────────────────────────

test('computeDayType — training when not enough consecutive days (beginner)', () => {
  const records = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER - 1 }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true),
  )
  expect(computeDayType(records, `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER).padStart(2, '0')}`, true)).toBe('training')
})

test('computeDayType — recovery after TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER consecutive successful days', () => {
  const records = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true),
  )
  const nextDate = `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 1).padStart(2, '0')}`
  expect(computeDayType(records, nextDate, true)).toBe('recovery')
})

test('computeDayType — recovery after TRAINING_DAYS_BEFORE_RECOVERY consecutive successful days (non-beginner)', () => {
  const records = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true),
  )
  const nextDate = `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY + 1).padStart(2, '0')}`
  expect(computeDayType(records, nextDate, false)).toBe('recovery')
})

test('computeDayType — training after failure records (no fatigue accumulation)', () => {
  // All records with plank AND squat failure — no core success → don't count toward recovery
  const records = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 2 }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 20, false, 20, 8, false),
  )
  const nextDate = `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 3).padStart(2, '0')}`
  expect(computeDayType(records, nextDate, true)).toBe('training')
})

test('computeDayType — training after a gap (gap itself is rest)', () => {
  const records = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true),
  )
  // targetDate is 2 days after last record (1 missed day)
  const lastDay = TRAINING_DAYS_BEFORE_RECOVERY
  const targetDate = `2026-02-${String(lastDay + 2).padStart(2, '0')}`
  expect(computeDayType(records, targetDate, false)).toBe('training')
})

test('computeDayType — training resets after a recovery record', () => {
  // N training days, then 1 recovery day, then 1 training day
  const trainingBefore = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true),
  )
  const recoveryRecord = {
    ...dailyRecord(`2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 1).padStart(2, '0')}`, 30, 30, true, 10, 10, true),
    day_type: 'recovery' as const,
  }
  const trainingAfter = dailyRecord(
    `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 2).padStart(2, '0')}`,
    60, 60, true, 20, 20, true,
  )
  const records = [...trainingBefore, recoveryRecord, trainingAfter]
  const nextDate = `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 3).padStart(2, '0')}`
  // Only 1 consecutive training day since recovery → below beginner threshold
  expect(computeDayType(records, nextDate, true)).toBe('training')
})

test('computeTomorrowPlan — recovery day produces reduced targets and recovery_day reason', () => {
  const records = Array.from({ length: TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 80, 80, true, 30, 30, true),
  )
  const nextDate = `2026-02-${String(TRAINING_DAYS_BEFORE_RECOVERY_BEGINNER + 1).padStart(2, '0')}`
  const plan = computeTomorrowPlan(records, params, baseTargets, nextDate)

  expect(plan.day_type).toBe('recovery')
  expect(plan.plank_reason).toBe('recovery_day')
  expect(plan.squat_reason).toBe('recovery_day')
  // Recovery target = max(base, round(lastTarget * RECOVERY_LOAD_FACTOR))
  expect(plan.plank_target_sec).toBe(Math.max(baseTargets.base_P, Math.round(80 * RECOVERY_LOAD_FACTOR)))
  expect(plan.squat_target_reps).toBe(Math.max(baseTargets.base_S, Math.round(30 * RECOVERY_LOAD_FACTOR)))
})

test('computeTomorrowPlan — recovery day record preserves consecutive streak (computeConsecutiveDays)', () => {
  // 4 training days, then a recovery day, then 1 training day
  const trainingDays = Array.from({ length: 4 }, (_, i) =>
    dailyRecord(`2026-02-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true),
  )
  const recoveryRecord = {
    ...dailyRecord('2026-02-05', 30, 30, true, 10, 10, true),
    day_type: 'recovery' as const,
  }
  const lastTraining = dailyRecord('2026-02-06', 60, 60, true, 20, 20, true)
  const records = [...trainingDays, recoveryRecord, lastTraining]

  // Habit streak from Feb 6 backward: Feb6, Feb5, Feb4, Feb3, Feb2, Feb1 = 6 consecutive
  expect(computeConsecutiveDays(records, '2026-02-06')).toBe(6)
})

test('computeTomorrowPlan — weekly cap holds target when growth already exceeded WEEKLY_CAP_TIMED', () => {
  // Setup: 22 records (non-beginner), targets growing in blocks with gaps between blocks.
  // Gaps prevent consecutive training streak from hitting TRAINING_DAYS_BEFORE_RECOVERY=5,
  // and also break recovery prescriptions so we reach the cap check.
  // Block targets: Jan1-4=60, Jan6-9=80, Jan11-14=100, Jan16-19=120, Jan21-24=140, Jan26-27=160
  // sorted[14]=Jan18(120) = weekly baseline for sorted[22-8]=sorted[14]
  // lastRecord=Jan27(160), weeklyRecord=sorted[14]=Jan18(120)
  // capCeiling = max(160, round(120 * 1.20)) = max(160, 144) = 160 → hold at 160
  const records: DailyRecord[] = [
    ...Array.from({ length: 4 }, (_, i) => dailyRecord(`2026-01-${String(i + 1).padStart(2, '0')}`, 60, 60, true, 20, 20, true)),
    // gap Jan5
    ...Array.from({ length: 4 }, (_, i) => dailyRecord(`2026-01-${String(i + 6).padStart(2, '0')}`, 80, 80, true, 20, 20, true)),
    // gap Jan10
    ...Array.from({ length: 4 }, (_, i) => dailyRecord(`2026-01-${String(i + 11).padStart(2, '0')}`, 100, 100, true, 20, 20, true)),
    // gap Jan15
    ...Array.from({ length: 4 }, (_, i) => dailyRecord(`2026-01-${String(i + 16).padStart(2, '0')}`, 120, 120, true, 20, 20, true)),
    // gap Jan20
    ...Array.from({ length: 4 }, (_, i) => dailyRecord(`2026-01-${String(i + 21).padStart(2, '0')}`, 140, 140, true, 20, 20, true)),
    // gap Jan25
    ...Array.from({ length: 2 }, (_, i) => dailyRecord(`2026-01-${String(i + 26).padStart(2, '0')}`, 160, 160, true, 20, 20, true)),
  ] // 4+4+4+4+4+2 = 22 records
  // Target Jan28: last 2 consecutive training days (Jan26-Jan27) < TRAINING_DAYS_BEFORE_RECOVERY=5
  // AND the gap before Jan26 resets consecutive count → training day
  const plan = computeTomorrowPlan(records, params, baseTargets, '2026-01-28')

  // weeklyRecord = records[22-8] = records[14] = Jan18 with plank=120
  // capCeiling = max(160, round(120 * 1.20)) = max(160, 144) = 160 (growth already exceeded cap)
  // rawTarget (success_progression +5%): max(161, round(160*1.05)) = max(161, 168) = 168
  // capped to 160 → holds
  expect(plan.plank_target_sec).toBe(160)
  expect(plan.day_type).toBe('training')
})

test('computeTomorrowPlan — day_type is training for normal progression', () => {
  const plan = computeTomorrowPlan(
    [dailyRecord('2026-02-16', 60, 60, true, 20, 20, true)],
    params,
    baseTargets,
  )
  expect(plan.day_type).toBe('training')
})
