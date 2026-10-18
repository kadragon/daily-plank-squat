import { beforeEach, expect, test } from 'bun:test'
import { createInitialAppState } from './initial-state'
import type { DailyRecord } from '../types'
import { getTodayDateKey } from '../utils/date-key'

function createMemoryStorage(): Storage {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.get(key) ?? null
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
  }
}

function seedToday(overrides: Partial<DailyRecord>) {
  const record: DailyRecord = {
    date: getTodayDateKey(),
    plank: { target_sec: 60, actual_sec: 60, success: true },
    squat: { target_reps: 20, actual_reps: 0, success: false },
    pushup: { target_reps: 15, actual_reps: 0, success: false },
    deadhang: { target_sec: 30, actual_sec: 30, success: true },
    dumbbell: null,
    fatigue: 0.2,
    F_P: 0,
    F_S: 0,
    F_U: 0,
    F_D: 0,
    F_DB: 0,
    F_total_raw: 0,
    inactive_time_ratio: 0.7,
    flag_suspicious: true,
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
    ...overrides,
  }
  localStorage.setItem('daily-records', JSON.stringify([record]))
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = createMemoryStorage()
})

test('each timed exercise restores its own inactive ratio', () => {
  seedToday({
    plank: { target_sec: 60, actual_sec: 60, success: true, inactive_time_ratio: 0.7 },
    deadhang: { target_sec: 30, actual_sec: 30, success: true, inactive_time_ratio: 0 },
  })

  const initial = createInitialAppState()
  expect(initial.plankInactiveTimeRatio).toBe(0.7)
  expect(initial.deadhangInactiveTimeRatio).toBe(0)
})

test('a legacy record without per-exercise ratios falls back to the day ratio', () => {
  seedToday({})

  const initial = createInitialAppState()
  expect(initial.plankInactiveTimeRatio).toBe(0.7)
  expect(initial.deadhangInactiveTimeRatio).toBe(0.7)
})
