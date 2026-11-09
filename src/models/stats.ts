import type { DailyRecord } from '../types'
import { addDaysToDateKey, getTodayDateKey, isValidDateKey } from '../utils/date-key'

export type StatsRange = 'all' | '7d' | '30d'

// Upper bound on expanded days, so a stray ancient date cannot blow up the chart.
export const MAX_SERIES_DAYS = 3650

export interface WorkoutTotals {
  plankActualSec: number
  squatActualReps: number
  pushupActualReps: number
  deadhangActualSec: number
  dumbbellActualReps: number
}

// Values are null on calendar days without a stored record ("no record"),
// which is not the same as a recorded 0.
export interface DailyStatsPoint {
  date: string
  plankActualSec: number | null
  squatActualReps: number | null
  pushupActualReps: number | null
  deadhangActualSec: number | null
  dumbbellActualReps: number | null
}

function toSortedRecords(records: DailyRecord[]): DailyRecord[] {
  return records.toSorted((a, b) => a.date.localeCompare(b.date))
}

export function filterRecordsByRange(
  records: DailyRecord[],
  range: StatsRange,
  todayDateKey = getTodayDateKey(),
): DailyRecord[] {
  const sorted = toSortedRecords(records)
  if (range === 'all') return sorted

  const lowerBound = rangeStartDateKey(range, todayDateKey)

  return sorted.filter((record) => record.date >= lowerBound && record.date <= todayDateKey)
}

export function computeWorkoutTotals(records: DailyRecord[]): WorkoutTotals {
  return records.reduce(
    (totals, record) => ({
      plankActualSec: totals.plankActualSec + record.plank.actual_sec,
      squatActualReps: totals.squatActualReps + record.squat.actual_reps,
      pushupActualReps: totals.pushupActualReps + record.pushup.actual_reps,
      deadhangActualSec: totals.deadhangActualSec + record.deadhang.actual_sec,
      dumbbellActualReps: totals.dumbbellActualReps + (record.dumbbell?.actual_reps ?? 0),
    }),
    {
      plankActualSec: 0,
      squatActualReps: 0,
      pushupActualReps: 0,
      deadhangActualSec: 0,
      dumbbellActualReps: 0,
    },
  )
}

function rangeStartDateKey(range: Exclude<StatsRange, 'all'>, todayDateKey: string): string {
  const days = range === '7d' ? 7 : 30
  return addDaysToDateKey(todayDateKey, -(days - 1))
}

function emptyPoint(date: string): DailyStatsPoint {
  return {
    date,
    plankActualSec: null,
    squatActualReps: null,
    pushupActualReps: null,
    deadhangActualSec: null,
    dumbbellActualReps: null,
  }
}

function toPoint(record: DailyRecord): DailyStatsPoint {
  return {
    date: record.date,
    plankActualSec: record.plank.actual_sec,
    squatActualReps: record.squat.actual_reps,
    pushupActualReps: record.pushup.actual_reps,
    deadhangActualSec: record.deadhang.actual_sec,
    dumbbellActualReps: record.dumbbell?.actual_reps ?? 0,
  }
}

/**
 * One point per calendar day: 7d/30d span the whole range ending today,
 * 'all' spans the first through the last stored record, capped at MAX_SERIES_DAYS.
 * Records with malformed or future dates are skipped.
 */
export function buildDailyStatsSeries(
  records: DailyRecord[],
  range: StatsRange = 'all',
  todayDateKey = getTodayDateKey(),
): DailyStatsPoint[] {
  // Future-dated records (wrong clock, imported backup) are not charted; they would push
  // every real day out of the capped 'all' window.
  const inRange = filterRecordsByRange(records, range, todayDateKey)
    .filter((record) => isValidDateKey(record.date) && record.date <= todayDateKey)
  if (range === 'all' && inRange.length === 0) return []

  const byDate = new Map(inRange.map((record) => [record.date, record]))
  const end = range === 'all' ? inRange[inRange.length - 1].date : todayDateKey
  const earliest = addDaysToDateKey(end, -(MAX_SERIES_DAYS - 1))
  const first = range === 'all' ? inRange[0].date : rangeStartDateKey(range, todayDateKey)
  const start = first < earliest ? earliest : first

  const series: DailyStatsPoint[] = []
  for (let date = start; date <= end; date = addDaysToDateKey(date, 1)) {
    const record = byDate.get(date)
    series.push(record ? toPoint(record) : emptyPoint(date))
  }
  return series
}
