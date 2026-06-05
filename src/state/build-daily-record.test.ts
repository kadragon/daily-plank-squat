import { expect, test } from 'bun:test'
import { buildDailyRecord } from './build-daily-record'

const BASE_INPUT = {
  today: '2026-02-16',
  plankTargetSec: 60,
  plankResult: { actualSec: 60, success: true },
  plankLogged: true,
  plankVisibilityTracker: { hiddenAt: null, hiddenDurationMs: 0 },
  plankSessionElapsedMs: 60000,
  deadhangTargetSec: 30,
  deadhangResult: { actualSec: 30, success: true },
  deadhangLogged: false,
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

test('buildDailyRecord persists day_type training', () => {
  const { draftRecord } = buildDailyRecord({ ...BASE_INPUT, dayType: 'training' })
  expect(draftRecord.day_type).toBe('training')
})

test('buildDailyRecord persists day_type recovery', () => {
  const { draftRecord } = buildDailyRecord({ ...BASE_INPUT, dayType: 'recovery' })
  expect(draftRecord.day_type).toBe('recovery')
})
