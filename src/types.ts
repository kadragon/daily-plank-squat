// Plank State Machine
export type PlankState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type PlankEvent = 'start' | 'pause' | 'resume' | 'complete' | 'cancel'

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
}

export interface SquatRecord {
  target_count: number
  actual_count: number
  success: boolean
}

export interface DailyRecord {
  date: string // YYYY-MM-DD
  plank: ExerciseRecord
  squat: SquatRecord
  fatigue: number    // sigmoid fatigue score [0, 1]
  F_P: number        // plank EWMA fatigue
  F_S: number        // squat EWMA fatigue
}

// Fatigue Model Inputs
export interface FatigueParams {
  age: number
  weight: number  // kg
}

export interface FatigueHistory {
  plank: ExerciseRecord[]
  squat: SquatRecord[]
}
