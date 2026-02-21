// Plank State Machine
export type PlankState = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type PlankEvent = 'start' | 'countdown' | 'countdown_done' | 'pause' | 'resume' | 'complete' | 'cancel'

// Timer
export interface TimerSegment {
  start: number
  end: number | null
}

export interface TimerState {
  segments: TimerSegment[]
  state: PlankState
}

// Fatigue Model
export interface ExerciseRecord {
  target_sec: number
  actual_sec: number
  success: boolean
  rpe: number
}

export interface SquatRecord {
  target_reps: number
  actual_reps: number
  success: boolean
  rpe: number
}

export interface PushupRecord {
  target_reps: number
  actual_reps: number
  success: boolean
  rpe: number
}

export interface DailyRecord {
  date: string // YYYY-MM-DD
  plank: ExerciseRecord
  squat: SquatRecord
  pushup: PushupRecord
  fatigue: number // sigmoid fatigue score [0, 1]
  F_P: number // plank EWMA fatigue
  F_S: number // squat EWMA fatigue
  F_U: number // pushup EWMA fatigue
  F_total_raw: number
  inactive_time_ratio: number
  flag_suspicious: boolean
}

export interface HealthShortcutPayload {
  schema_version: string
  date: string
  workout_type: string
  duration_sec: number
  plank_actual_sec: number
  squat_actual_reps: number
  pushup_actual_reps: number
  fatigue: number
  flag_suspicious: boolean
  source: string
}

export type Gender = 'male' | 'female' | 'other'

// Fatigue Model Inputs
export interface FatigueParams {
  age: number
  weight_kg: number
  gender: Gender
}

export interface FatigueHistory {
  plank: ExerciseRecord[]
  squat: SquatRecord[]
  pushup: PushupRecord[]
}

export interface BaseTargets {
  base_P: number
  base_S: number
  base_U: number
}

export interface FatigueSnapshot {
  F_P: number
  F_S: number
  F_U: number
  F_total_raw: number
  F_total_adj: number
  fatigue: number
  median_m: number
}

export type RecommendationReason =
  | 'failure_streak'
  | 'high_fatigue_hold'
  | 'rpe_very_high_reduce'
  | 'rpe_high_hold'
  | 'rpe_low_boost'
  | 'neutral_progression'

export interface TomorrowPlan {
  plank_target_sec: number
  squat_target_reps: number
  pushup_target_reps: number
  plank_reason: RecommendationReason
  squat_reason: RecommendationReason
  pushup_reason: RecommendationReason
  fatigue: number
  F_P: number
  F_S: number
  F_U: number
  F_total_raw: number
  overload_warning: boolean
}
