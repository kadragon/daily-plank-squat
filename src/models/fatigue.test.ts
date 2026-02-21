import { expect, test } from 'bun:test'
import type { BaseTargets, DailyRecord, FatigueParams } from '../types'
import {
  ALPHA_D,
  ALPHA_P,
  ALPHA_S,
  ALPHA_U,
  MEDIAN_INITIAL,
  computeAgeFactor,
  computeFatigueScore,
  computeFatigueSeries,
  computeLoad,
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
      rpe: 5,
    },
    squat: {
      target_reps: squatTarget,
      actual_reps: squatActual,
      success: squatSuccess,
      rpe: 5,
    },
    pushup: {
      target_reps: 15,
      actual_reps: 15,
      success: true,
      rpe: 5,
    },
    deadhang: {
      target_sec: 30,
      actual_sec: 30,
      success: true,
      rpe: 5,
    },
    fatigue: 0,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_total_raw: 0,
    inactive_time_ratio: 0,
    flag_suspicious: false,
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

test('computeSharedFatigueRaw(F_P, F_S, F_U, F_D) returns 4-exercise weighted formula', () => {
  const allOnes = 0.22 + 0.28 + 0.28 + 0.22 + 0.07 + 0.06 + 0.05 + 0.05 + 0.04 + 0.04
  expect(computeSharedFatigueRaw(1.0, 1.0, 1.0, 1.0)).toBeCloseTo(allOnes)
  const expected = (
    0.22 * 0.5
    + 0.28 * 1.0
    + 0.28 * 0
    + 0.22 * 0.2
    + 0.07 * 0.5 * 0.2
    + 0.06 * 1.0 * 0
    + 0.05 * 0.5 * 1.0
    + 0.05 * 0.5 * 0
    + 0.04 * 1.0 * 0.2
    + 0.04 * 0 * 0.2
  )
  expect(computeSharedFatigueRaw(0.5, 1.0, 0, 0.2)).toBeCloseTo(expected)
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

test('computeFatigueSeries computes F_U via pushup EWMA', () => {
  const records: DailyRecord[] = [
    {
      ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 15, success: true, rpe: 5 },
    },
    {
      ...dailyRecord('2026-02-17', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 15, success: true, rpe: 5 },
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

test('increases targets when fatigue is low', () => {
  const plan = computeTomorrowPlan(
    [dailyRecord('2026-02-16', 60, 60, true, 20, 20, true)],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBeGreaterThan(60)
  expect(plan.squat_target_reps).toBeGreaterThan(20)
})

test('computeTomorrowPlan increases pushup target when fatigue low', () => {
  const record: DailyRecord = {
    ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    pushup: { target_reps: 15, actual_reps: 15, success: true, rpe: 5 },
  }
  const plan = computeTomorrowPlan([record], params, baseTargets)
  expect(plan.pushup_target_reps).toBeGreaterThan(15)
})

test('computeTomorrowPlan increases deadhang target when fatigue low', () => {
  const record: DailyRecord = {
    ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
    deadhang: { target_sec: 30, actual_sec: 30, success: true, rpe: 5 },
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
      pushup: { target_reps: 15, actual_reps: 30, success: true, rpe: 5 },
    },
    {
      ...dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
      pushup: { target_reps: 100, actual_reps: 200, success: true, rpe: 5 },
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
      deadhang: { target_sec: 30, actual_sec: 60, success: true, rpe: 5 },
    },
    {
      ...dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
      deadhang: { target_sec: 300, actual_sec: 450, success: true, rpe: 5 },
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
      pushup: { target_reps: 15, actual_reps: 5, success: false, rpe: 5 },
    },
    {
      ...dailyRecord('2026-02-15', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 5, success: false, rpe: 5 },
    },
    {
      ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
      pushup: { target_reps: 15, actual_reps: 5, success: false, rpe: 5 },
    },
  ]
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.pushup_target_reps).toBe(14) // 15 * 0.9 = 13.5 → 14
})

test('computeTomorrowPlan decreases pushup target after failure streak', () => {
  const records: DailyRecord[] = Array.from({ length: 3 }, (_, i) => ({
    ...dailyRecord(`2026-02-${14 + i}`, 60, 60, true, 20, 20, true),
    pushup: { target_reps: 20, actual_reps: 5, success: false, rpe: 5 },
  }))
  const plan = computeTomorrowPlan(records, params, baseTargets)
  expect(plan.pushup_target_reps).toBe(18) // 20 * 0.9 = 18
})

test('hasFailureStreak detects deadhang 3-day failure streak', () => {
  const records: DailyRecord[] = Array.from({ length: 3 }, (_, i) => ({
    ...dailyRecord(`2026-02-${14 + i}`, 60, 60, true, 20, 20, true),
    deadhang: { target_sec: 30, actual_sec: 10, success: false, rpe: 5 },
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
  const plankTarget = computeNextTarget(60, [{ target_sec: 60, actual_sec: 60, success: true, rpe: 5 }], params)
  const squatTarget = computeSquatTarget(20, [{ target_reps: 20, actual_reps: 20, success: true, rpe: 5 }], params)

  expect(plankTarget).toBeGreaterThan(60)
  expect(squatTarget).toBeGreaterThan(20)
})

test('computePushupTarget compatibility wrapper computes next pushup target', () => {
  const pushupTarget = computePushupTarget(15, [{ target_reps: 15, actual_reps: 15, success: true, rpe: 5 }], params)
  expect(pushupTarget).toBeGreaterThan(15)
})

test('computeTomorrowPlan applies neutral progression (+5%) for rpe 5~6', () => {
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true, rpe: 5 },
      squat: { target_reps: 20, actual_reps: 20, success: true, rpe: 6 },
      pushup: { target_reps: 20, actual_reps: 20, success: true, rpe: 5 },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(105)
  expect(plan.squat_target_reps).toBe(21)
  expect(plan.pushup_target_reps).toBe(21)
})

test('computeTomorrowPlan applies rpe low boost (+8%) for rpe 1~4', () => {
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true, rpe: 1 },
      squat: { target_reps: 20, actual_reps: 20, success: true, rpe: 4 },
      pushup: { target_reps: 20, actual_reps: 20, success: true, rpe: 3 },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(108)
  expect(plan.squat_target_reps).toBe(22)
  expect(plan.pushup_target_reps).toBe(22)
})

test('computeTomorrowPlan holds target for rpe 7~8', () => {
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true, rpe: 7 },
      squat: { target_reps: 20, actual_reps: 20, success: true, rpe: 8 },
      pushup: { target_reps: 20, actual_reps: 20, success: true, rpe: 7 },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(100)
  expect(plan.squat_target_reps).toBe(20)
  expect(plan.pushup_target_reps).toBe(20)
})

test('computeTomorrowPlan decreases target by 5% for rpe 9~10', () => {
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true, rpe: 9 },
      squat: { target_reps: 20, actual_reps: 20, success: true, rpe: 10 },
      pushup: { target_reps: 20, actual_reps: 20, success: true, rpe: 9 },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_target_sec).toBe(95)
  expect(plan.squat_target_reps).toBe(19)
  expect(plan.pushup_target_reps).toBe(19)
})

test('failure streak has priority over low-rpe boost', () => {
  const records: DailyRecord[] = Array.from({ length: 3 }, (_, i) => ({
    ...dailyRecord(`2026-02-${14 + i}`, 100, 20, false, 20, 8, false),
    plank: { target_sec: 100, actual_sec: 20, success: false, rpe: 1 },
    squat: { target_reps: 20, actual_reps: 8, success: false, rpe: 1 },
    pushup: { target_reps: 20, actual_reps: 5, success: false, rpe: 1 },
  }))
  const plan = computeTomorrowPlan(records, params, baseTargets)

  expect(plan.plank_target_sec).toBe(90)
  expect(plan.squat_target_reps).toBe(18)
  expect(plan.pushup_target_reps).toBe(18)
})

test('fatigue hold has priority over low-rpe boost', () => {
  const plan = computeTomorrowPlan(
    [
      {
        ...dailyRecord('2026-02-16', 60, 60, true, 20, 20, true),
        plank: { target_sec: 60, actual_sec: 60, success: true, rpe: 1 },
        squat: { target_reps: 20, actual_reps: 20, success: true, rpe: 1 },
        pushup: { target_reps: 15, actual_reps: 30, success: true, rpe: 1 },
      },
      {
        ...dailyRecord('2026-02-17', 800, 1200, true, 300, 450, true),
        plank: { target_sec: 800, actual_sec: 1200, success: true, rpe: 1 },
        squat: { target_reps: 300, actual_reps: 450, success: true, rpe: 1 },
        pushup: { target_reps: 100, actual_reps: 200, success: true, rpe: 1 },
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

test('computeTomorrowPlan returns per-exercise reason codes', () => {
  const plan = computeTomorrowPlan(
    [{
      ...dailyRecord('2026-02-16', 100, 100, true, 20, 20, true),
      plank: { target_sec: 100, actual_sec: 100, success: true, rpe: 3 },
      squat: { target_reps: 20, actual_reps: 20, success: true, rpe: 8 },
      pushup: { target_reps: 20, actual_reps: 20, success: true, rpe: 10 },
      deadhang: { target_sec: 30, actual_sec: 30, success: true, rpe: 5 },
    }],
    params,
    baseTargets,
  )

  expect(plan.plank_reason).toBe('rpe_low_boost')
  expect(plan.squat_reason).toBe('rpe_high_hold')
  expect(plan.pushup_reason).toBe('rpe_very_high_reduce')
  expect(plan.deadhang_reason).toBe('neutral_progression')
})
