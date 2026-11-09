import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Window } from 'happy-dom'
import WorkoutStats from './workout-stats'
import type { DailyRecord } from '../types'
import { addDaysToDateKey, getTodayDateKey } from '../utils/date-key'

const happyWindow = new Window({ url: 'https://localhost/' })
happyWindow.SyntaxError = SyntaxError

if (typeof document === 'undefined') {
  Object.assign(globalThis, {
    window: happyWindow,
    document: happyWindow.document,
    navigator: happyWindow.navigator,
    localStorage: happyWindow.localStorage,
    Element: happyWindow.Element,
    HTMLElement: happyWindow.HTMLElement,
    Node: happyWindow.Node,
    Event: happyWindow.Event,
    PointerEvent: happyWindow.PointerEvent,
  })
}

afterEach(() => {
  cleanup()
})

function record(date: string, plank: number, squat: number): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: plank, success: plank >= 60 },
    squat: { target_reps: 20, actual_reps: squat, success: squat >= 20 },
    pushup: { target_reps: 15, actual_reps: 15, success: true },
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

const RECORDS = [record('2026-02-01', 60, 0), record('2026-02-03', 75, 22)]

function chart(view: ReturnType<typeof render>, label: string) {
  const svg = view.getByLabelText(label)
  const readout = svg.closest('.workout-stats__chart')?.querySelector('.workout-stats__readout') ?? null
  return { svg, readout }
}

test('arrow keys select days and read out value with unit or no-record text', () => {
  const view = render(<WorkoutStats records={RECORDS} />)
  const { svg, readout } = chart(view, '플랭크 차트')

  expect(svg.getAttribute('tabindex')).toBe('0')
  expect(readout?.textContent).toBe('')

  fireEvent.keyDown(svg, { key: 'ArrowLeft' })
  expect(readout?.textContent).toBe('2026-02-03 · 75초')

  fireEvent.keyDown(svg, { key: 'ArrowLeft' })
  expect(readout?.textContent).toBe('2026-02-02 · 기록 없음')

  fireEvent.keyDown(svg, { key: 'Home' })
  expect(readout?.textContent).toBe('2026-02-01 · 60초')

  fireEvent.keyDown(svg, { key: 'ArrowLeft' })
  expect(readout?.textContent).toBe('2026-02-01 · 60초')
})

test('recorded zero reads out as a value, not as no record', () => {
  const view = render(<WorkoutStats records={RECORDS} />)
  const { svg, readout } = chart(view, '스쿼트 차트')

  fireEvent.keyDown(svg, { key: 'Home' })
  expect(readout?.textContent).toBe('2026-02-01 · 0회')
})

test('tapping a chart selects the nearest day', () => {
  const view = render(<WorkoutStats records={RECORDS} />)
  const { svg, readout } = chart(view, '플랭크 차트')
  svg.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 100, height: 160, right: 100, bottom: 160, x: 0, y: 0, toJSON: () => ({}),
  })

  // A touch that starts a scroll must not select a day.
  fireEvent.pointerDown(svg, { clientX: 60, pointerType: 'touch' })
  fireEvent.pointerMove(svg, { clientX: 60, pointerType: 'touch' })
  expect(readout?.textContent).toBe('')

  // Chart inner area spans x=36..84, so x=60 is the middle day.
  fireEvent.click(svg, { clientX: 60 })
  expect(readout?.textContent).toBe('2026-02-02 · 기록 없음')

  fireEvent.pointerLeave(svg, { pointerType: 'touch' })
  expect(readout?.textContent).toBe('2026-02-02 · 기록 없음')
})

test('switching range clears a day selection from the previous range', () => {
  const today = getTodayDateKey()
  const view = render(<WorkoutStats records={[record(addDaysToDateKey(today, -20), 60, 20), record(today, 70, 21)]} />)

  fireEvent.click(view.getByText('30일'))
  const { svg, readout } = chart(view, '플랭크 차트')
  fireEvent.keyDown(svg, { key: 'Home' })
  expect(readout?.textContent).toBe(`${addDaysToDateKey(today, -29)} · 기록 없음`)

  fireEvent.click(view.getByText('7일'))
  expect(chart(view, '플랭크 차트').readout?.textContent).toBe('')
})

test('selection follows the chosen date when records change', () => {
  const view = render(<WorkoutStats records={RECORDS} />)
  fireEvent.keyDown(chart(view, '플랭크 차트').svg, { key: 'End' })

  view.rerender(<WorkoutStats records={[record('2026-01-31', 50, 10), ...RECORDS]} />)
  expect(chart(view, '플랭크 차트').readout?.textContent).toBe('2026-02-03 · 75초')

  view.rerender(<WorkoutStats records={[RECORDS[0]]} />)
  const { svg, readout } = chart(view, '플랭크 차트')
  expect(readout?.textContent).toBe('')
  expect(Number(svg.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(Number(svg.getAttribute('aria-valuemax')))
})

test('unselected slider still announces the latest day', () => {
  const view = render(<WorkoutStats records={RECORDS} />)
  expect(chart(view, '플랭크 차트').svg.getAttribute('aria-valuetext')).toBe('2026-02-03 · 75초')
})
