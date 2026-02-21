import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import WorkoutStats from './workout-stats'
import type { DailyRecord } from '../types'

function record(date: string, plank: number, squat: number, pushup: number): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: plank, success: plank >= 60 },
    squat: { target_reps: 20, actual_reps: squat, success: squat >= 20 },
    pushup: { target_reps: 15, actual_reps: pushup, success: pushup >= 15 },
    deadhang: { target_sec: 30, actual_sec: 30, success: true },
    fatigue: 0.4,
    F_P: 0.3,
    F_S: 0.2,
    F_U: 0.1,
    F_D: 0.1,
    F_total_raw: 0.5,
    inactive_time_ratio: 0,
    flag_suspicious: false,
  }
}

test('WorkoutStats renders cumulative cards for plank, squat, pushup, and deadhang', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats
      records={[
        record('2026-02-19', 60, 20, 15),
        record('2026-02-20', 45, 12, 10),
      ]}
    />,
  )

  expect(html).toContain('Total plank')
  expect(html).toContain('105s')
  expect(html).toContain('Total squat')
  expect(html).toContain('32')
  expect(html).toContain('Total pushup')
  expect(html).toContain('25')
  expect(html).toContain('Total deadhang')
  expect(html).toContain('60s')
})

test('WorkoutStats renders separate charts per exercise', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats records={[record('2026-02-20', 60, 20, 15)]} />,
  )

  expect(html).toContain('aria-label="Plank chart"')
  expect(html).toContain('aria-label="Squat chart"')
  expect(html).toContain('aria-label="Pushup chart"')
  expect(html).toContain('aria-label="Deadhang chart"')
})

test('WorkoutStats shows empty message when no records exist', () => {
  const html = renderToStaticMarkup(<WorkoutStats records={[]} />)

  expect(html).toContain('No records yet. Complete a workout to see stats.')
})
