import type { DailyRecord, ExerciseRecord, PushupRecord, RpeUnlockRecord, SquatRecord } from '../types'
import { getTodayDateKey } from '../utils/date-key'
import { NEUTRAL_RPE, normalizeRpe } from '../utils/rpe'

const STORAGE_KEY = 'daily-records'

const NEUTRAL_PUSHUP: PushupRecord = { target_reps: 15, actual_reps: 15, success: true, rpe: NEUTRAL_RPE }
const NEUTRAL_DEADHANG: ExerciseRecord = { target_sec: 30, actual_sec: 30, success: true, rpe: NEUTRAL_RPE }

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asExerciseRecord(value: unknown): ExerciseRecord | null {
  if (!isRecord(value)) return null
  if (
    typeof value.target_sec !== 'number'
    || typeof value.actual_sec !== 'number'
    || typeof value.success !== 'boolean'
  ) {
    return null
  }

  return {
    target_sec: value.target_sec,
    actual_sec: value.actual_sec,
    success: value.success,
    rpe: normalizeRpe(value.rpe),
  }
}

function asSquatRecord(value: unknown): SquatRecord | null {
  if (!isRecord(value)) return null

  // v1.1 schema
  if (
    typeof value.target_reps === 'number'
    && typeof value.actual_reps === 'number'
    && typeof value.success === 'boolean'
  ) {
    return {
      target_reps: value.target_reps,
      actual_reps: value.actual_reps,
      success: value.success,
      rpe: normalizeRpe(value.rpe),
    }
  }

  // legacy schema compatibility
  if (
    typeof value.target_count === 'number'
    && typeof value.actual_count === 'number'
    && typeof value.success === 'boolean'
  ) {
    return {
      target_reps: value.target_count,
      actual_reps: value.actual_count,
      success: value.success,
      rpe: normalizeRpe(value.rpe),
    }
  }

  return null
}

function asPushupRecord(value: unknown): PushupRecord | null {
  if (!isRecord(value)) return null

  if (
    typeof value.target_reps === 'number'
    && typeof value.actual_reps === 'number'
    && typeof value.success === 'boolean'
  ) {
    return {
      target_reps: value.target_reps,
      actual_reps: value.actual_reps,
      success: value.success,
      rpe: normalizeRpe(value.rpe),
    }
  }

  return null
}

function asRpeUnlockRecord(value: unknown): RpeUnlockRecord | null {
  if (!isRecord(value)) return null
  if (
    typeof value.plank !== 'boolean'
    || typeof value.squat !== 'boolean'
    || typeof value.pushup !== 'boolean'
    || typeof value.deadhang !== 'boolean'
  ) {
    return null
  }

  return {
    plank: value.plank,
    squat: value.squat,
    pushup: value.pushup,
    deadhang: value.deadhang,
  }
}

function deriveLegacyRpeUnlock(
  plank: ExerciseRecord,
  squat: SquatRecord,
  pushup: PushupRecord,
  deadhang: ExerciseRecord,
): RpeUnlockRecord {
  return {
    plank: plank.success,
    squat: squat.actual_reps > 0,
    pushup: pushup.actual_reps > 0,
    deadhang: deadhang.success,
  }
}

function asDailyRecord(value: unknown): DailyRecord | null {
  if (!isRecord(value)) return null

  const plank = asExerciseRecord(value.plank)
  const squat = asSquatRecord(value.squat)
  if (!plank || !squat) return null

  if (
    typeof value.date !== 'string'
    || typeof value.fatigue !== 'number'
    || typeof value.F_P !== 'number'
    || typeof value.F_S !== 'number'
  ) {
    return null
  }

  const pushup = asPushupRecord(value.pushup) ?? NEUTRAL_PUSHUP
  const deadhang = asExerciseRecord(value.deadhang) ?? NEUTRAL_DEADHANG
  const rpeUnlock = asRpeUnlockRecord(value.rpe_unlock) ?? deriveLegacyRpeUnlock(plank, squat, pushup, deadhang)

  return {
    date: value.date,
    plank,
    squat,
    pushup,
    deadhang,
    rpe_unlock: rpeUnlock,
    fatigue: value.fatigue,
    F_P: value.F_P,
    F_S: value.F_S,
    F_U: typeof value.F_U === 'number' ? value.F_U : 0,
    F_D: typeof value.F_D === 'number' ? value.F_D : 0,
    F_total_raw: typeof value.F_total_raw === 'number' ? value.F_total_raw : 0,
    inactive_time_ratio: typeof value.inactive_time_ratio === 'number' ? value.inactive_time_ratio : 0,
    flag_suspicious: typeof value.flag_suspicious === 'boolean' ? value.flag_suspicious : false,
  }
}

function readAll(): DailyRecord[] {
  if (!hasLocalStorage()) return []

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .map(asDailyRecord)
    .filter((record): record is DailyRecord => record !== null)
}

export function saveRecord(record: DailyRecord): void {
  if (!hasLocalStorage()) return

  const records = readAll()
  const existingIndex = records.findIndex((item) => item.date === record.date)
  if (existingIndex >= 0) {
    records[existingIndex] = record
  } else {
    records.push(record)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function loadAllRecords(): DailyRecord[] {
  return readAll().toSorted((a, b) => a.date.localeCompare(b.date))
}

export function loadTodayRecord(): DailyRecord | null {
  const today = getTodayDateKey()
  return readAll().find((record) => record.date === today) ?? null
}

export function loadHistory(days: number): DailyRecord[] {
  return readAll()
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
}
