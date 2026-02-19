import { expect, test } from 'bun:test'
import type { DailyRecord } from '../types'
import { buildHealthPayload, buildShortcutRunUrl } from './apple-health-shortcut'

function sampleRecord(): DailyRecord {
  return {
    date: '2026-02-19',
    plank: { target_sec: 60, actual_sec: 75, success: true },
    squat: { target_reps: 20, actual_reps: 18, success: false },
    pushup: { target_reps: 15, actual_reps: 12, success: false },
    fatigue: 0.42,
    F_P: 0.31,
    F_S: 0.28,
    F_U: 0.33,
    F_total_raw: 0.5,
    inactive_time_ratio: 0.1,
    flag_suspicious: true,
  }
}

test('buildHealthPayload computes duration with reps conversion (2 sec per rep)', () => {
  const payload = buildHealthPayload(sampleRecord())
  const expectedDuration = 75 + 2 * (18 + 12)

  expect(payload.duration_sec).toBe(expectedDuration)
  expect(payload.plank_actual_sec).toBe(75)
  expect(payload.squat_actual_reps).toBe(18)
  expect(payload.pushup_actual_reps).toBe(12)
})

test('buildShortcutRunUrl encodes shortcut name and payload JSON in text input', () => {
  const payload = buildHealthPayload(sampleRecord())
  const url = buildShortcutRunUrl(payload, 'Daily Plank Squat To Health')
  const parsed = new URL(url)

  expect(parsed.protocol).toBe('shortcuts:')
  expect(parsed.pathname).toBe('/run-shortcut')
  expect(parsed.searchParams.get('name')).toBe('Daily Plank Squat To Health')
  expect(parsed.searchParams.get('input')).toBe('text')

  const text = parsed.searchParams.get('text')
  expect(text).toBeTruthy()
  expect(JSON.parse(text as string)).toEqual(payload)
})

test('buildHealthPayload includes expected schema and source metadata', () => {
  const payload = buildHealthPayload(sampleRecord())

  expect(payload.schema_version).toBe('1.0')
  expect(payload.workout_type).toBe('Functional Strength Training')
  expect(payload.source).toBe('daily-plank-squat-web')
  expect(payload.flag_suspicious).toBe(true)
})
