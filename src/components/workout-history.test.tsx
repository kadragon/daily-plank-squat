import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DailyRecord } from '../types'
import WorkoutHistory from './workout-history'

function record(date: string, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: 63, success: true },
    squat: { target_reps: 20, actual_reps: 21, success: true },
    pushup: { target_reps: 15, actual_reps: 16, success: true },
    deadhang: { target_sec: 30, actual_sec: 31, success: true },
    dumbbell: { target_reps: 10, actual_reps: 10, success: true },
    fatigue: 0.2,
    F_P: 0.2,
    F_S: 0.2,
    F_U: 0.2,
    F_D: 0.2,
    F_DB: 0.2,
    F_total_raw: 0.2,
    inactive_time_ratio: 0.1,
    flag_suspicious: false,
    squat_completed: true,
    pushup_completed: true,
    dumbbell_completed: true,
    ...overrides,
  }
}

test('WorkoutHistory renders stats and the per-day records section', () => {
  const html = renderToStaticMarkup(<WorkoutHistory records={[record('2026-10-17')]} />)

  expect(html).toContain('운동 통계')
  expect(html).toContain('날짜별 기록')
})

test('WorkoutHistory lists days newest first with per-exercise actuals', () => {
  const html = renderToStaticMarkup(
    <WorkoutHistory records={[record('2026-10-16'), record('2026-10-17', { dumbbell: null })]} />,
  )

  expect(html.indexOf('2026-10-17')).toBeLessThan(html.indexOf('2026-10-16'))
  expect(html).toContain('플랭크 63초 · 스쿼트 21회 · 푸시업 16회 · 데드행 31초 · 덤벨 컬 10회')
  expect(html).toContain('플랭크 63초 · 스쿼트 21회 · 푸시업 16회 · 데드행 31초</span>')
})

test('WorkoutHistory shows an empty notice without records', () => {
  const html = renderToStaticMarkup(<WorkoutHistory records={[]} />)

  expect(html).toContain('아직 기록이 없습니다.')
})

test('WorkoutHistory omits exercises with no activity that day', () => {
  const html = renderToStaticMarkup(
    <WorkoutHistory
      records={[record('2026-10-17', {
        pushup: { target_reps: 15, actual_reps: 0, success: false },
        deadhang: { target_sec: 30, actual_sec: 0, success: false },
        dumbbell: { target_reps: 10, actual_reps: 0, success: false },
      })]}
    />,
  )

  expect(html).toContain('플랭크 63초 · 스쿼트 21회</span>')
  expect(html).not.toContain('푸시업 0회')
})

test('WorkoutHistory shows a no-activity note for an all-zero day', () => {
  const html = renderToStaticMarkup(
    <WorkoutHistory
      records={[record('2026-10-17', {
        plank: { target_sec: 60, actual_sec: 0, success: false },
        squat: { target_reps: 20, actual_reps: 0, success: false },
        pushup: { target_reps: 15, actual_reps: 0, success: false },
        deadhang: { target_sec: 30, actual_sec: 0, success: false },
        dumbbell: null,
      })]}
    />,
  )

  expect(html).toContain('운동 기록 없음')
})
