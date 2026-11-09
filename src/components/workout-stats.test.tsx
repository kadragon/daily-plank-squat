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

test('WorkoutStats renders cumulative cards for plank, squat, pushup, and deadhang', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats
      records={[
        record('2026-02-19', 60, 20, 15),
        record('2026-02-20', 45, 12, 10),
      ]}
    />,
  )

  expect(html).toContain('플랭크 합계')
  expect(html).toContain('105초')
  expect(html).toContain('스쿼트 합계')
  expect(html).toContain('32')
  expect(html).toContain('푸시업 합계')
  expect(html).toContain('25')
  expect(html).toContain('데드행 합계')
  expect(html).toContain('60초')
})

test('WorkoutStats renders separate charts per exercise', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats records={[record('2026-02-20', 60, 20, 15)]} />,
  )

  expect(html).toContain('aria-label="플랭크 차트"')
  expect(html).toContain('aria-label="스쿼트 차트"')
  expect(html).toContain('aria-label="푸시업 차트"')
  expect(html).toContain('aria-label="데드행 차트"')
})

test('WorkoutStats shows empty message when no records exist', () => {
  const html = renderToStaticMarkup(<WorkoutStats records={[]} />)

  expect(html).toContain('아직 기록이 없습니다. 운동을 완료하면 통계가 표시됩니다.')
})

test('WorkoutStats shows all/7d/30d range filters', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats records={[record('2026-02-20', 60, 20, 15)]} />,
  )

  expect(html).toContain('>전체<')
  expect(html).toContain('>7일<')
  expect(html).toContain('>30일<')
})

test('WorkoutStats draws an isolated recorded day as its own segment', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats records={[record('2026-02-01', 60, 20, 15), record('2026-02-04', 62, 22, 17)]} />,
  )

  // Five charts, each with two separate segments and two points; nothing spans 02-02..02-03.
  expect(html.match(/<polyline /g)?.length).toBe(10)
  expect(html.match(/<circle /g)?.length).toBe(10)
})

test('WorkoutStats breaks chart lines across days without records', () => {
  const html = renderToStaticMarkup(
    <WorkoutStats
      records={[
        record('2026-02-01', 60, 20, 15),
        record('2026-02-02', 61, 21, 16),
        record('2026-02-04', 62, 22, 17),
        record('2026-02-05', 63, 23, 18),
      ]}
    />,
  )

  // Five charts, each with two separate segments and one point per recorded day.
  expect(html.match(/<polyline /g)?.length).toBe(10)
  expect(html.match(/<circle /g)?.length).toBe(20)
  // The missing day still gets its own x-axis slot.
  expect(html).toContain('>02-03<')
})
