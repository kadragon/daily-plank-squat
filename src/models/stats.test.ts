import { expect, test } from 'bun:test'
import { MAX_SERIES_DAYS, buildDailyStatsSeries, computeWorkoutTotals, filterRecordsByRange } from './stats'
import type { DailyRecord } from '../types'

function record(date: string, plank: number, squat: number, pushup: number): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: plank, success: plank >= 60 },
    squat: { target_reps: 20, actual_reps: squat, success: squat >= 20 },
    pushup: { target_reps: 15, actual_reps: pushup, success: pushup >= 15 },
    deadhang: { target_sec: 30, actual_sec: 30, success: true },
    dumbbell: { target_reps: 10, actual_reps: 10, success: true },
    fatigue: 0.4,
    F_P: 0.3,
    F_S: 0.2,
    F_U: 0.1,
    F_D: 0.1,
    F_DB: 0.1,
    F_total_raw: 0.5,
    inactive_time_ratio: 0,
    flag_suspicious: false,
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
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
    deadhangActualSec: 90,
    dumbbellActualReps: 30,
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
      deadhangActualSec: 30,
      dumbbellActualReps: 10,
    },
    {
      date: '2026-02-19',
      plankActualSec: 60,
      squatActualReps: 20,
      pushupActualReps: 15,
      deadhangActualSec: 30,
      dumbbellActualReps: 10,
    },
    {
      date: '2026-02-20',
      plankActualSec: 75,
      squatActualReps: 25,
      pushupActualReps: 20,
      deadhangActualSec: 30,
      dumbbellActualReps: 10,
    },
  ])
})

test('buildDailyStatsSeries expands missing days as null and keeps totals', () => {
  const records = [
    record('2026-02-04', 70, 22, 0),
    record('2026-02-01', 60, 20, 15),
  ]

  const series = buildDailyStatsSeries(records, 'all', '2026-02-10')

  expect(series.map((point) => point.date)).toEqual([
    '2026-02-01',
    '2026-02-02',
    '2026-02-03',
    '2026-02-04',
  ])
  expect(series.map((point) => point.plankActualSec)).toEqual([60, null, null, 70])
  expect(series[1]).toEqual({
    date: '2026-02-02',
    plankActualSec: null,
    squatActualReps: null,
    pushupActualReps: null,
    deadhangActualSec: null,
    dumbbellActualReps: null,
  })
  // A recorded 0 stays 0 and is distinct from a missing day.
  expect(series[3].pushupActualReps).toBe(0)
  expect(computeWorkoutTotals(records).plankActualSec).toBe(130)
})

test('buildDailyStatsSeries spans every day of the 7d range ending today', () => {
  const series = buildDailyStatsSeries(
    [record('2026-02-01', 60, 20, 15), record('2026-02-16', 61, 21, 16)],
    '7d',
    '2026-02-20',
  )

  expect(series.map((point) => point.date)).toEqual([
    '2026-02-14',
    '2026-02-15',
    '2026-02-16',
    '2026-02-17',
    '2026-02-18',
    '2026-02-19',
    '2026-02-20',
  ])
  expect(series.map((point) => point.squatActualReps)).toEqual([null, null, 21, null, null, null, null])
})

test('buildDailyStatsSeries skips malformed dates and bounds the all-range span', () => {
  const malformed = { ...record('2026-02-01', 60, 20, 15), date: 'invalid' }
  expect(buildDailyStatsSeries([record('2026-02-01', 60, 20, 15), malformed], 'all', '2026-02-10'))
    .toEqual(buildDailyStatsSeries([record('2026-02-01', 60, 20, 15)], 'all', '2026-02-10'))

  const series = buildDailyStatsSeries(
    [record('1000-01-01', 10, 1, 1), record('2026-02-01', 60, 20, 15)],
    'all',
    '2026-02-10',
  )
  expect(series.length).toBe(MAX_SERIES_DAYS)
  expect(series[series.length - 1].date).toBe('2026-02-01')
})

test('buildDailyStatsSeries keeps real days charted when a record is dated in the future', () => {
  const series = buildDailyStatsSeries(
    [record('2026-01-31', 50, 10, 5), record('2026-02-01', 60, 20, 15), record('2099-01-01', 70, 21, 16)],
    'all',
    '2026-02-03',
  )

  expect(series.map((point) => point.date)).toEqual(['2026-01-31', '2026-02-01'])
  expect(series.map((point) => point.plankActualSec)).toEqual([50, 60])
})
