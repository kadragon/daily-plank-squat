import { beforeEach, expect, test } from 'bun:test'
import { loadAllRecords, loadHistory, loadTodayRecord, saveRecord } from './daily-record'
import type { DailyRecord } from '../types'

const STORAGE_KEY = 'daily-records'

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

function sampleRecord(date: string): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: 60, success: true },
    squat: { target_reps: 20, actual_reps: 20, success: true },
    pushup: { target_reps: 15, actual_reps: 15, success: true },
    fatigue: 0.4,
    F_P: 0.3,
    F_S: 0.2,
    F_U: 0.1,
    F_total_raw: 0.5,
    inactive_time_ratio: 0,
    flag_suspicious: false,
  }
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = createMemoryStorage()
})

test('saves record to localStorage as JSON', () => {
  saveRecord(sampleRecord('2026-02-18'))

  expect(localStorage.getItem(STORAGE_KEY)).toBe(
    JSON.stringify([sampleRecord('2026-02-18')]),
  )
})

test("loads today's record, null if absent", () => {
  expect(loadTodayRecord()).toBeNull()

  const today = new Date().toISOString().slice(0, 10)
  const record = sampleRecord(today)
  saveRecord(record)

  expect(loadTodayRecord()).toEqual(record)
})

test('loads history for last N days', () => {
  saveRecord(sampleRecord('2026-02-16'))
  saveRecord(sampleRecord('2026-02-17'))
  saveRecord(sampleRecord('2026-02-18'))

  expect(loadHistory(2)).toEqual([
    sampleRecord('2026-02-18'),
    sampleRecord('2026-02-17'),
  ])
})

test('record matches PRD schema (date, plank, squat, fatigue, F_P, F_S)', () => {
  const today = new Date().toISOString().slice(0, 10)

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        date: today,
        plank: { target_sec: 60, actual_sec: 60, success: true },
        squat: { target_reps: 20, actual_reps: 20, success: true },
        fatigue: 0.4,
        F_P: 0.3,
      },
    ]),
  )

  expect(loadTodayRecord()).toBeNull()
  expect(loadHistory(1)).toEqual([])
})

test('overwrites existing record for same date', () => {
  const date = '2026-02-18'
  const first = sampleRecord(date)
  const second: DailyRecord = {
    ...sampleRecord(date),
    plank: { target_sec: 60, actual_sec: 45, success: false },
    fatigue: 0.8,
  }

  saveRecord(first)
  saveRecord(second)

  expect(loadHistory(10)).toEqual([second])
})

test('malformed JSON in storage does not crash read or write paths', () => {
  localStorage.setItem(STORAGE_KEY, '{bad-json')

  expect(loadHistory(5)).toEqual([])
  expect(loadTodayRecord()).toBeNull()

  const record = sampleRecord('2026-02-18')
  saveRecord(record)
  expect(loadHistory(1)).toEqual([record])
})

test('legacy squat schema is upgraded to target_reps/actual_reps', () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        ...sampleRecord('2026-02-18'),
        squat: {
          target_count: 20,
          actual_count: 18,
          success: false,
        },
      },
    ]),
  )

  const loaded = loadAllRecords()
  expect(loaded).toHaveLength(1)
  expect(loaded[0]?.squat).toEqual({
    target_reps: 20,
    actual_reps: 18,
    success: false,
  })
})

test('Records without pushup field load with neutral pushup defaults (target=15, actual=15, success=true)', () => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        date: today,
        plank: { target_sec: 60, actual_sec: 60, success: true },
        squat: { target_reps: 20, actual_reps: 20, success: true },
        fatigue: 0.4,
        F_P: 0.3,
        F_S: 0.2,
        F_total_raw: 0.5,
      },
    ]),
  )

  const record = loadTodayRecord()
  expect(record?.pushup).toEqual({ target_reps: 15, actual_reps: 15, success: true })
})

test('Records without F_U field load with F_U=0', () => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        date: today,
        plank: { target_sec: 60, actual_sec: 60, success: true },
        squat: { target_reps: 20, actual_reps: 20, success: true },
        fatigue: 0.4,
        F_P: 0.3,
        F_S: 0.2,
        F_total_raw: 0.5,
      },
    ]),
  )

  const record = loadTodayRecord()
  expect(record?.F_U).toBe(0)
})

test('Records with valid pushup field parse correctly', () => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        date: today,
        plank: { target_sec: 60, actual_sec: 60, success: true },
        squat: { target_reps: 20, actual_reps: 20, success: true },
        pushup: { target_reps: 15, actual_reps: 12, success: false },
        fatigue: 0.4,
        F_P: 0.3,
        F_S: 0.2,
        F_U: 0.15,
        F_total_raw: 0.5,
      },
    ]),
  )

  const record = loadTodayRecord()
  expect(record?.pushup).toEqual({ target_reps: 15, actual_reps: 12, success: false })
  expect(record?.F_U).toBe(0.15)
})
