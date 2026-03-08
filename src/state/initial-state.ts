import {
  computeTomorrowPlan,
} from '../models/fatigue'
import { loadAllRecords } from '../storage/daily-record'
import type { BaseTargets, DailyRecord, FatigueParams, PlankState, RecommendationReason } from '../types'
import { addDaysToDateKey, getTodayDateKey } from '../utils/date-key'

export interface InitialAppState {
  records: DailyRecord[]
  plankTargetSec: number
  squatTargetReps: number
  pushupTargetReps: number
  deadhangTargetSec: number
  plankActualSec: number
  plankSuccess: boolean
  deadhangActualSec: number
  deadhangSuccess: boolean
  squatActualReps: number
  squatSuccess: boolean
  pushupActualReps: number
  pushupSuccess: boolean
  dumbbellTargetReps: number
  dumbbellActualReps: number
  dumbbellSuccess: boolean
  fatigue: number
  overloadWarning: boolean
  suspiciousSession: boolean
  tomorrowPlankTargetSec: number
  tomorrowSquatTargetReps: number
  tomorrowPushupTargetReps: number
  tomorrowDeadhangTargetSec: number
  tomorrowDumbbellTargetReps: number
  tomorrowPlankReason: RecommendationReason
  tomorrowSquatReason: RecommendationReason
  tomorrowPushupReason: RecommendationReason
  tomorrowDeadhangReason: RecommendationReason
  tomorrowDumbbellReason: RecommendationReason
  plankState: PlankState
  deadhangState: PlankState
  alreadyLoggedPlankToday: boolean
  alreadyLoggedDeadhangToday: boolean
  squatCompleted: boolean
  pushupCompleted: boolean
  dumbbellCompleted: boolean
}

export const BASE_TARGETS: BaseTargets = {
  base_P: 60,
  base_S: 20,
  base_U: 15,
  base_D: 30,
  base_DB: 10,
}

export const DEFAULT_PARAMS: FatigueParams = {
  age: 30,
  weight_kg: 70,
  gender: 'other',
}

export function computeSquatSuccess(actualReps: number, targetReps: number): boolean {
  return actualReps >= targetReps
}

function todayKey(): string {
  return getTodayDateKey()
}

function isPlankLogged(record: DailyRecord | null): boolean {
  if (!record) return false
  return record.plank.success || record.plank.actual_sec > 0
}

function isDeadhangLogged(record: DailyRecord | null): boolean {
  if (!record) return false
  return record.deadhang.success || record.deadhang.actual_sec > 0
}

export { todayKey }

export function createInitialAppState(initialPlankState?: PlankState): InitialAppState {
  const records = loadAllRecords()
  const today = todayKey()
  const todayRecord = records.find((record) => record.date === today) ?? null
  const historyBeforeToday = records.filter((record) => record.date < today)

  const todayTargets = todayRecord
    ? {
      plank_target_sec: todayRecord.plank.target_sec,
      squat_target_reps: todayRecord.squat.target_reps,
      pushup_target_reps: todayRecord.pushup.target_reps,
      deadhang_target_sec: todayRecord.deadhang.target_sec,
      dumbbell_target_reps: todayRecord.dumbbell.target_reps,
      fatigue: todayRecord.fatigue,
    }
    : computeTomorrowPlan(historyBeforeToday, DEFAULT_PARAMS, BASE_TARGETS, today)

  const tomorrowPlan = computeTomorrowPlan(records, DEFAULT_PARAMS, BASE_TARGETS, addDaysToDateKey(today, 1))
  const plankLoggedToday = isPlankLogged(todayRecord)
  const deadhangLoggedToday = isDeadhangLogged(todayRecord)

  return {
    records,
    plankTargetSec: todayTargets.plank_target_sec,
    squatTargetReps: todayTargets.squat_target_reps,
    pushupTargetReps: todayTargets.pushup_target_reps,
    deadhangTargetSec: todayTargets.deadhang_target_sec,
    dumbbellTargetReps: todayTargets.dumbbell_target_reps,
    plankActualSec: todayRecord?.plank.actual_sec ?? 0,
    plankSuccess: todayRecord?.plank.success ?? false,
    deadhangActualSec: todayRecord?.deadhang.actual_sec ?? 0,
    deadhangSuccess: todayRecord?.deadhang.success ?? false,
    squatActualReps: todayRecord?.squat.actual_reps ?? 0,
    squatSuccess: todayRecord?.squat.success ?? false,
    pushupActualReps: todayRecord?.pushup.actual_reps ?? 0,
    pushupSuccess: todayRecord?.pushup.success ?? false,
    dumbbellActualReps: todayRecord?.dumbbell.actual_reps ?? 0,
    dumbbellSuccess: todayRecord?.dumbbell.success ?? false,
    fatigue: todayRecord?.fatigue ?? todayTargets.fatigue,
    overloadWarning: todayRecord ? tomorrowPlan.overload_warning : false,
    suspiciousSession: todayRecord?.flag_suspicious ?? false,
    tomorrowPlankTargetSec: tomorrowPlan.plank_target_sec,
    tomorrowSquatTargetReps: tomorrowPlan.squat_target_reps,
    tomorrowPushupTargetReps: tomorrowPlan.pushup_target_reps,
    tomorrowDeadhangTargetSec: tomorrowPlan.deadhang_target_sec,
    tomorrowDumbbellTargetReps: tomorrowPlan.dumbbell_target_reps,
    tomorrowPlankReason: tomorrowPlan.plank_reason,
    tomorrowSquatReason: tomorrowPlan.squat_reason,
    tomorrowPushupReason: tomorrowPlan.pushup_reason,
    tomorrowDeadhangReason: tomorrowPlan.deadhang_reason,
    tomorrowDumbbellReason: tomorrowPlan.dumbbell_reason,
    plankState: initialPlankState ?? (plankLoggedToday ? (todayRecord?.plank.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE'),
    deadhangState: deadhangLoggedToday ? (todayRecord?.deadhang.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE',
    alreadyLoggedPlankToday: plankLoggedToday,
    alreadyLoggedDeadhangToday: deadhangLoggedToday,
    squatCompleted: todayRecord?.squat_completed ?? false,
    pushupCompleted: todayRecord?.pushup_completed ?? false,
    dumbbellCompleted: todayRecord?.dumbbell_completed ?? false,
  }
}
