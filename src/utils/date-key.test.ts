import { expect, test } from 'bun:test'
import { addDaysToDateKey, getTodayDateKey, toLocalDateKey } from './date-key'

test('toLocalDateKey returns YYYY-MM-DD using local date fields', () => {
  const date = new Date(2026, 1, 20, 23, 59, 0)

  expect(toLocalDateKey(date)).toBe('2026-02-20')
})

test('getTodayDateKey delegates to local date key formatter', () => {
  const date = new Date(2026, 1, 21, 0, 1, 0)

  expect(getTodayDateKey(date)).toBe('2026-02-21')
})

test('addDaysToDateKey moves across month boundaries', () => {
  expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28')
  expect(addDaysToDateKey('2026-01-31', 1)).toBe('2026-02-01')
})
