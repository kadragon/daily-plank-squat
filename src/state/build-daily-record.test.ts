import { expect, test } from 'bun:test'
import { buildDailyRecord } from './build-daily-record'

const BASE_INPUT = {
  today: '2026-02-16',
  plankTargetSec: 60,
  plankResult: { actualSec: 60, success: true },
  plankLogged: true,
  plankCancelled: false,
  plankVisibilityTracker: { hiddenAt: null, hiddenDurationMs: 0 },
  plankSessionElapsedMs: 60000,
  deadhangTargetSec: 30,
  deadhangResult: { actualSec: 30, success: true },
  deadhangLogged: false,
  deadhangCancelled: false,
  deadhangVisibilityTracker: { hiddenAt: null, hiddenDurationMs: 0 },
  deadhangSessionElapsedMs: 0,
  squatTargetReps: 20,
  squatCount: 20,
  squatSuccess: true,
  squatCompleted: true,
  pushupTargetReps: 15,
  pushupCount: 15,
  pushupSuccess: true,
  pushupCompleted: true,
  dumbbellTargetReps: 10,
  dumbbellCount: 10,
  dumbbellSuccess: true,
  dumbbellCompleted: true,
  nowMs: 1000000,
}

test('buildDailyRecord persists the given day_type', () => {
  expect(buildDailyRecord({ ...BASE_INPUT, dayType: 'training' }).draftRecord.day_type).toBe('training')
  expect(buildDailyRecord({ ...BASE_INPUT, dayType: 'recovery' }).draftRecord.day_type).toBe('recovery')
})

test('buildDailyRecord stores each timed exercise its own inactive ratio and the day max on top', () => {
  const { draftRecord, flagSuspicious } = buildDailyRecord({
    ...BASE_INPUT,
    plankVisibilityTracker: { hiddenAt: null, hiddenDurationMs: 42_000 },
    deadhangLogged: true,
    deadhangSessionElapsedMs: 30_000,
    dayType: 'training',
  })
  expect(draftRecord.plank.inactive_time_ratio).toBeCloseTo(0.7)
  expect(draftRecord.deadhang.inactive_time_ratio).toBe(0)
  expect(draftRecord.inactive_time_ratio).toBeCloseTo(0.7)
  expect(flagSuspicious).toBe(true)
})

test('buildDailyRecord stores whether each timed run was cancelled apart from its success', () => {
  const { draftRecord } = buildDailyRecord({
    ...BASE_INPUT,
    plankTargetSec: 90,
    plankResult: { actualSec: 60, success: false },
    deadhangLogged: true,
    deadhangResult: { actualSec: 20, success: false },
    deadhangCancelled: true,
    deadhangSessionElapsedMs: 20_000,
    dayType: 'training',
  })
  expect(draftRecord.plank.cancelled).toBe(false)
  expect(draftRecord.deadhang.cancelled).toBe(true)
})
