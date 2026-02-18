import type { DailyRecord } from '../types'

const STORAGE_KEY = 'daily-records'

function readAll(): DailyRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed.filter(isDailyRecord)
}

export function saveRecord(record: DailyRecord): void {
  const records = readAll()
  const existingIndex = records.findIndex((item) => item.date === record.date)
  if (existingIndex >= 0) {
    records[existingIndex] = record
  } else {
    records.push(record)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function loadTodayRecord(): DailyRecord | null {
  const today = new Date().toISOString().slice(0, 10)
  return readAll().find((record) => record.date === today) ?? null
}

export function loadHistory(days: number): DailyRecord[] {
  return readAll()
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isExerciseRecord(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.target_sec === 'number' &&
    typeof value.actual_sec === 'number' &&
    typeof value.success === 'boolean'
  )
}

function isSquatRecord(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.target_count === 'number' &&
    typeof value.actual_count === 'number' &&
    typeof value.success === 'boolean'
  )
}

function isDailyRecord(value: unknown): value is DailyRecord {
  if (!isRecord(value)) return false
  return (
    typeof value.date === 'string' &&
    isExerciseRecord(value.plank) &&
    isSquatRecord(value.squat) &&
    typeof value.fatigue === 'number' &&
    typeof value.F_P === 'number' &&
    typeof value.F_S === 'number'
  )
}
