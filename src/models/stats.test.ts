import { expect, test } from 'bun:test'
import { buildDailyStatsSeries, computeWorkoutTotals, filterRecordsByRange } from './stats'
import type { DailyRecord } from '../types'

function record(date: string, plank: number, squat: number, pushup: number): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: plank, success: plank >= 60 },
    squat: { target_reps: 20, actual_reps: squat, success: squat >= 20 },
    pushup: { target_reps: 15, actual_reps: pushup, success: pushup >= 15 },
    fatigue: 0.4,
    F_P: 0.3,
    F_S: 0.2,
    F_U: 0.1,
    F_total_raw: 0.5,
    inactive_time_ratio: 0,
    flag_suspicious: false,
  }
}

test('filterRecordsByRange keeps all records for all range', () => {
  const records = [
    record('2026-02-01', 61, 20, 15),
    record('2026-02-20', 62, 21, 16),
  ]

  expect(filterRecordsByRange(records, 'all', '2026-02-20')).toEqual([
    record('2026-02-01', 61, 20, 15),
    record('2026-02-20', 62, 21, 16),
  ])
})

test('filterRecordsByRange returns only last 7 days for 7d range', () => {
  const records = [
    record('2026-02-10', 60, 20, 15),
    record('2026-02-14', 61, 21, 16),
    record('2026-02-20', 62, 22, 17),
  ]

  expect(filterRecordsByRange(records, '7d', '2026-02-20')).toEqual([
    record('2026-02-14', 61, 21, 16),
    record('2026-02-20', 62, 22, 17),
  ])
})

test('filterRecordsByRange returns only last 30 days for 30d range', () => {
  const records = [
    record('2026-01-15', 60, 20, 15),
    record('2026-01-22', 61, 21, 16),
    record('2026-02-20', 62, 22, 17),
  ]

  expect(filterRecordsByRange(records, '30d', '2026-02-20')).toEqual([
    record('2026-01-22', 61, 21, 16),
    record('2026-02-20', 62, 22, 17),
  ])
})

test('computeWorkoutTotals sums plank seconds and reps per exercise', () => {
  const totals = computeWorkoutTotals([
    record('2026-02-18', 45, 12, 8),
    record('2026-02-19', 60, 20, 15),
    record('2026-02-20', 75, 25, 20),
  ])

  expect(totals).toEqual({
    plankActualSec: 180,
    squatActualReps: 57,
    pushupActualReps: 43,
  })
})

test('buildDailyStatsSeries returns date-sorted daily values', () => {
  const series = buildDailyStatsSeries([
    record('2026-02-20', 75, 25, 20),
    record('2026-02-18', 45, 12, 8),
    record('2026-02-19', 60, 20, 15),
  ])

  expect(series).toEqual([
    {
      date: '2026-02-18',
      plankActualSec: 45,
      squatActualReps: 12,
      pushupActualReps: 8,
    },
    {
      date: '2026-02-19',
      plankActualSec: 60,
      squatActualReps: 20,
      pushupActualReps: 15,
    },
    {
      date: '2026-02-20',
      plankActualSec: 75,
      squatActualReps: 25,
      pushupActualReps: 20,
    },
  ])
})
