import { beforeEach, expect, test } from 'bun:test'
import { loadHistory, loadTodayRecord, saveRecord } from './daily-record'
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
      return data.has(key) ? data.get(key)! : null
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
    squat: { target_count: 20, actual_count: 20, success: true },
    fatigue: 0.4,
    F_P: 0.3,
    F_S: 0.2,
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
        squat: { target_count: 20, actual_count: 20, success: true },
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
