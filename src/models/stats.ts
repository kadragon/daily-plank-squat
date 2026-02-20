import type { DailyRecord } from '../types'
import { addDaysToDateKey, getTodayDateKey } from '../utils/date-key'

export type StatsRange = 'all' | '7d' | '30d'

export interface WorkoutTotals {
  plankActualSec: number
  squatActualReps: number
  pushupActualReps: number
}

export interface DailyStatsPoint {
  date: string
  plankActualSec: number
  squatActualReps: number
  pushupActualReps: number
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

  const days = range === '7d' ? 7 : 30
  const lowerBound = addDaysToDateKey(todayDateKey, -(days - 1))

  return sorted.filter((record) => record.date >= lowerBound && record.date <= todayDateKey)
}

export function computeWorkoutTotals(records: DailyRecord[]): WorkoutTotals {
  return records.reduce(
    (totals, record) => ({
      plankActualSec: totals.plankActualSec + record.plank.actual_sec,
      squatActualReps: totals.squatActualReps + record.squat.actual_reps,
      pushupActualReps: totals.pushupActualReps + record.pushup.actual_reps,
    }),
    {
      plankActualSec: 0,
      squatActualReps: 0,
      pushupActualReps: 0,
    },
  )
}

export function buildDailyStatsSeries(records: DailyRecord[]): DailyStatsPoint[] {
  return toSortedRecords(records).map((record) => ({
    date: record.date,
    plankActualSec: record.plank.actual_sec,
    squatActualReps: record.squat.actual_reps,
    pushupActualReps: record.pushup.actual_reps,
  }))
}
