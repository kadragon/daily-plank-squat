import { getInactiveTimeRatio, type VisibilityTracker } from '../hooks/use-visibility'
import type { DailyRecord } from '../types'

export type PersistReason = 'general' | 'squat-complete' | 'pushup-complete' | 'dumbbell-complete'
export type CompleteSaveFeedbackTarget = 'squat' | 'pushup' | 'dumbbell'
export type SaveFeedbackTone = 'info' | 'success' | 'error'

export interface TimedWorkoutResult {
  actualSec: number
  success: boolean
}

export function getCompleteSaveFeedbackTarget(reason: PersistReason): CompleteSaveFeedbackTarget | null {
  if (reason === 'squat-complete') return 'squat'
  if (reason === 'pushup-complete') return 'pushup'
  if (reason === 'dumbbell-complete') return 'dumbbell'
  return null
}

export interface BuildDailyRecordInput {
  today: string
  plankTargetSec: number
  plankResult: TimedWorkoutResult
  plankLogged: boolean
  plankVisibilityTracker: VisibilityTracker
  plankSessionElapsedMs: number
  deadhangTargetSec: number
  deadhangResult: TimedWorkoutResult
  deadhangLogged: boolean
  deadhangVisibilityTracker: VisibilityTracker
  deadhangSessionElapsedMs: number
  squatTargetReps: number
  squatCount: number
  squatSuccess: boolean
  squatCompleted: boolean
  pushupTargetReps: number
  pushupCount: number
  pushupSuccess: boolean
  pushupCompleted: boolean
  dumbbellTargetReps: number
  dumbbellCount: number
  dumbbellSuccess: boolean
  dumbbellCompleted: boolean
  nowMs: number
}

export interface BuildDailyRecordResult {
  draftRecord: DailyRecord
  inactiveTimeRatio: number
  flagSuspicious: boolean
}

export function buildDailyRecord(input: BuildDailyRecordInput): BuildDailyRecordResult {
  const plankInactiveTimeRatio = input.plankLogged
    ? getInactiveTimeRatio(input.plankVisibilityTracker, input.plankSessionElapsedMs, input.nowMs)
    : 0
  const deadhangInactiveTimeRatio = input.deadhangLogged
    ? getInactiveTimeRatio(input.deadhangVisibilityTracker, input.deadhangSessionElapsedMs, input.nowMs)
    : 0
  const inactiveTimeRatio = Math.max(plankInactiveTimeRatio, deadhangInactiveTimeRatio)
  const flagSuspicious = (input.plankLogged || input.deadhangLogged) ? inactiveTimeRatio > 0.5 : false

  const draftRecord: DailyRecord = {
    date: input.today,
    plank: {
      target_sec: input.plankTargetSec,
      actual_sec: input.plankResult.actualSec,
      success: input.plankResult.success,
    },
    squat: {
      target_reps: input.squatTargetReps,
      actual_reps: input.squatCount,
      success: input.squatSuccess,
    },
    pushup: {
      target_reps: input.pushupTargetReps,
      actual_reps: input.pushupCount,
      success: input.pushupSuccess,
    },
    deadhang: {
      target_sec: input.deadhangTargetSec,
      actual_sec: input.deadhangResult.actualSec,
      success: input.deadhangResult.success,
    },
    dumbbell: {
      target_reps: input.dumbbellTargetReps,
      actual_reps: input.dumbbellCount,
      success: input.dumbbellSuccess,
    },
    fatigue: 0,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    inactive_time_ratio: inactiveTimeRatio,
    flag_suspicious: flagSuspicious,
    squat_completed: input.squatCompleted,
    pushup_completed: input.pushupCompleted,
    dumbbell_completed: input.dumbbellCompleted,
  }

  return { draftRecord, inactiveTimeRatio, flagSuspicious }
}
