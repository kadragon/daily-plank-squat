import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Window } from 'happy-dom'
import App from './app'
import type { DailyRecord } from './types'
import { getTodayDateKey } from './utils/date-key'

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
    requestAnimationFrame: happyWindow.requestAnimationFrame.bind(happyWindow),
    cancelAnimationFrame: happyWindow.cancelAnimationFrame.bind(happyWindow),
  })
}

afterEach(() => {
  cleanup()
  happyWindow.localStorage.clear()
})

function swipe(main: HTMLElement, startX: number, endX: number, y = 220) {
  fireEvent.pointerDown(main, {
    clientX: startX,
    clientY: y,
    pointerId: 1,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(main, {
    clientX: endX,
    clientY: y,
    pointerId: 1,
    pointerType: 'touch',
  })
}

function readStoredRecords(): DailyRecord[] {
  const raw = happyWindow.localStorage.getItem('daily-records')
  if (!raw) return []
  return JSON.parse(raw) as DailyRecord[]
}

function setNumberInputValue(input: Element, value: string) {
  const field = input as HTMLInputElement
  field.value = value
  fireEvent.input(field)
  fireEvent.change(field)
}

function seedTodayRecord(overrides: Partial<DailyRecord> = {}) {
  const record: DailyRecord = {
    date: getTodayDateKey(),
    plank: { target_sec: 60, actual_sec: 63, success: true },
    squat: { target_reps: 20, actual_reps: 21, success: true },
    pushup: { target_reps: 15, actual_reps: 16, success: true },
    deadhang: { target_sec: 30, actual_sec: 31, success: true },
    fatigue: 0.2,
    F_P: 0.2,
    F_S: 0.2,
    F_U: 0.2,
    F_D: 0.2,
    F_total_raw: 0.2,
    inactive_time_ratio: 0.1,
    flag_suspicious: false,
    ...overrides,
  }

  happyWindow.localStorage.setItem('daily-records', JSON.stringify([record]))
}

test('Swipe left from plank moves to squat', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)

  expect(view.getByText('Squat Counter')).toBeTruthy()
})

test('Swipe right on first tab is a no-op', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 120, 260)

  expect(view.getByText('Plank Timer')).toBeTruthy()
})

test('Swipe started from input does not navigate', () => {
  const view = render(<App initialView="squat" />)
  const doneInput = view.container.querySelector('#squat-done-reps')
  if (!doneInput) throw new Error('squat done reps input not found')

  fireEvent.pointerDown(doneInput, {
    clientX: 260,
    clientY: 260,
    pointerId: 1,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(doneInput, {
    clientX: 120,
    clientY: 260,
    pointerId: 1,
    pointerType: 'touch',
  })

  expect(view.getByText('Squat Counter')).toBeTruthy()
})

test('Tap navigation fallback switches tabs and updates active state', () => {
  const view = render(<App initialView="plank" />)
  const pushupTab = Array.from(view.container.querySelectorAll('button'))
    .find((button) => button.querySelector('.app-tabbar__label')?.textContent?.trim() === 'Pushup')
  if (!pushupTab) throw new Error('pushup tab button not found')

  fireEvent.click(pushupTab)

  expect(view.getByText('Pushup Counter')).toBeTruthy()
  expect(pushupTab.getAttribute('aria-current')).toBe('page')
})

test('Tap navigation can open stats tab', () => {
  const view = render(<App initialView="plank" />)
  const statsTab = Array.from(view.container.querySelectorAll('button'))
    .find((button) => button.querySelector('.app-tabbar__label')?.textContent?.trim() === 'Stats')
  if (!statsTab) throw new Error('stats tab button not found')

  fireEvent.click(statsTab)

  expect(view.getByText('Workout Stats')).toBeTruthy()
  expect(statsTab.getAttribute('aria-current')).toBe('page')
})

test('Tap navigation can open deadhang tab', () => {
  const view = render(<App initialView="plank" />)
  const deadhangTab = Array.from(view.container.querySelectorAll('button'))
    .find((button) => button.querySelector('.app-tabbar__label')?.textContent?.trim() === 'Deadhang')
  if (!deadhangTab) throw new Error('deadhang tab button not found')

  fireEvent.click(deadhangTab)

  expect(view.getByText('Deadhang Timer')).toBeTruthy()
  expect(deadhangTab.getAttribute('aria-current')).toBe('page')
})

test('Pointer up from a different pointer id does not trigger swipe navigation', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  fireEvent.pointerDown(main, {
    clientX: 260,
    clientY: 220,
    pointerId: 1,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(main, {
    clientX: 120,
    clientY: 220,
    pointerId: 2,
    pointerType: 'touch',
  })

  expect(view.getByText('Plank Timer')).toBeTruthy()
})

test('Swipe order includes stats after summary', () => {
  const view = render(<App initialView="summary" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)
  expect(view.getByText('Workout Stats')).toBeTruthy()

  swipe(main, 120, 260)
  expect(view.getByText('Daily Summary')).toBeTruthy()
})

test('Summary export button is disabled when there is no today record', () => {
  const view = render(<App initialView="summary" />)
  const button = view.getByRole('button', { name: 'Apple 건강에 기록' })

  expect(button.hasAttribute('disabled')).toBe(true)
})

test('App does not persist any record on initial render without interaction', () => {
  render(<App initialView="squat" />)

  expect(readStoredRecords()).toHaveLength(0)
})

test('Changing squat done reps immediately saves today record', async () => {
  const view = render(<App initialView="squat" />)
  const doneInput = view.container.querySelector('#squat-done-reps')
  if (!doneInput) throw new Error('squat done reps input not found')

  setNumberInputValue(doneInput, '12')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.squat.actual_reps).toBe(12)
  })
})

test('Changing squat target reps immediately saves today record', async () => {
  const view = render(<App initialView="squat" />)
  const targetInput = view.container.querySelector('#squat-target-reps')
  if (!targetInput) throw new Error('squat target reps input not found')

  setNumberInputValue(targetInput, '24')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.squat.target_reps).toBe(24)
  })
})

test('Changing pushup done reps updates existing today record instead of appending', async () => {
  const view = render(<App initialView="pushup" />)
  const doneInput = view.container.querySelector('#pushup-done-reps')
  if (!doneInput) throw new Error('pushup done reps input not found')

  setNumberInputValue(doneInput, '10')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.pushup.actual_reps).toBe(10)
  })
  setNumberInputValue(doneInput, '13')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.pushup.actual_reps).toBe(13)
  })
})

test('Changing pushup target reps immediately saves today record', async () => {
  const view = render(<App initialView="pushup" />)
  const targetInput = view.container.querySelector('#pushup-target-reps')
  if (!targetInput) throw new Error('pushup target reps input not found')

  setNumberInputValue(targetInput, '19')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.pushup.target_reps).toBe(19)
  })
})

test('RPE inputs are hidden before completion for all workout views', () => {
  const squatView = render(<App initialView="squat" />)
  expect(squatView.container.querySelector('#squat-rpe')).toBeNull()
  cleanup()

  const pushupView = render(<App initialView="pushup" />)
  expect(pushupView.container.querySelector('#pushup-rpe')).toBeNull()
  cleanup()

  const plankView = render(<App initialView="plank" />)
  expect(plankView.container.querySelector('#plank-rpe')).toBeNull()
  cleanup()

  const deadhangView = render(<App initialView="deadhang" />)
  expect(deadhangView.container.querySelector('#deadhang-rpe')).toBeNull()
})

test('Changing squat rpe is possible only after complete and saves today record', async () => {
  const view = render(<App initialView="squat" />)

  expect(view.container.querySelector('#squat-rpe')).toBeNull()
  fireEvent.click(view.getByRole('button', { name: 'Complete squats' }))

  await waitFor(() => {
    expect(view.container.querySelector('#squat-rpe')).toBeTruthy()
  })

  const rpeInput = view.container.querySelector('#squat-rpe')
  if (!rpeInput) throw new Error('squat rpe input not found after complete')

  setNumberInputValue(rpeInput, '8')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.squat.rpe).toBe(8)
    expect(stored[0]?.rpe_unlock.squat).toBe(true)
  })
})

test('Changing pushup rpe is possible only after complete and updates existing today record', async () => {
  const view = render(<App initialView="pushup" />)

  expect(view.container.querySelector('#pushup-rpe')).toBeNull()
  fireEvent.click(view.getByRole('button', { name: 'Complete pushups' }))

  await waitFor(() => {
    expect(view.container.querySelector('#pushup-rpe')).toBeTruthy()
  })

  const rpeInput = view.container.querySelector('#pushup-rpe')
  if (!rpeInput) throw new Error('pushup rpe input not found after complete')

  setNumberInputValue(rpeInput, '9')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.pushup.rpe).toBe(9)
    expect(stored[0]?.rpe_unlock.pushup).toBe(true)
  })
  setNumberInputValue(rpeInput, '7')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.pushup.rpe).toBe(7)
    expect(stored[0]?.rpe_unlock.pushup).toBe(true)
  })
})

test('Cancelling plank keeps plank rpe locked', async () => {
  const view = render(<App initialView="plank" />)

  fireEvent.click(view.getByRole('button', { name: 'Start' }))
  fireEvent.click(view.getByRole('button', { name: 'Cancel' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.plank.success).toBe(false)
    expect(stored[0]?.rpe_unlock.plank).toBe(false)
  })

  expect(view.container.querySelector('#plank-rpe')).toBeNull()
})

test('Completing plank unlocks rpe and keeps unlock state after rerender', async () => {
  seedTodayRecord({
    plank: { target_sec: 0, actual_sec: 0, success: false },
  })

  const view = render(<App initialView="plank" />)
  expect(view.container.querySelector('#plank-rpe')).toBeNull()

  fireEvent.click(view.getByRole('button', { name: 'Start' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored[0]?.plank.success).toBe(true)
    expect(stored[0]?.rpe_unlock.plank).toBe(true)
    expect(view.container.querySelector('#plank-rpe')).toBeTruthy()
  })

  const rpeInput = view.container.querySelector('#plank-rpe')
  if (!rpeInput) throw new Error('plank rpe input not found after complete')

  setNumberInputValue(rpeInput, '4')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored[0]?.plank.rpe).toBe(4)
    expect(stored[0]?.rpe_unlock.plank).toBe(true)
  })

  cleanup()
  const rerendered = render(<App initialView="plank" />)
  expect(rerendered.container.querySelector('#plank-rpe')).toBeTruthy()
})

test('Completing deadhang unlocks rpe and saves today record', async () => {
  seedTodayRecord({
    deadhang: { target_sec: 0, actual_sec: 0, success: false },
  })

  const view = render(<App initialView="deadhang" />)
  expect(view.container.querySelector('#deadhang-rpe')).toBeNull()

  fireEvent.click(view.getByRole('button', { name: 'Start' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored[0]?.deadhang.success).toBe(true)
    expect(stored[0]?.rpe_unlock.deadhang).toBe(true)
    expect(view.container.querySelector('#deadhang-rpe')).toBeTruthy()
  })

  const rpeInput = view.container.querySelector('#deadhang-rpe')
  if (!rpeInput) throw new Error('deadhang rpe input not found after complete')

  setNumberInputValue(rpeInput, '6')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.deadhang.rpe).toBe(6)
    expect(stored[0]?.rpe_unlock.deadhang).toBe(true)
  })
})

test('Plank complete and cancel both save/update today record', async () => {
  const cancelView = render(<App initialView="plank" />)
  fireEvent.click(cancelView.getByRole('button', { name: 'Start' }))
  fireEvent.click(cancelView.getByRole('button', { name: 'Cancel' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.plank.success).toBe(false)
  })

  cleanup()
  happyWindow.localStorage.clear()

  seedTodayRecord({
    plank: { target_sec: 0, actual_sec: 0, success: false },
    squat: { target_reps: 20, actual_reps: 12, success: false },
    pushup: { target_reps: 15, actual_reps: 10, success: false },
    deadhang: { target_sec: 30, actual_sec: 0, success: false },
  })

  const completeView = render(<App initialView="plank" />)
  fireEvent.click(completeView.getByRole('button', { name: 'Start' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.plank.success).toBe(true)
  })
})

test('Deadhang start is disabled when plank is running', () => {
  const view = render(<App initialView="deadhang" initialPlankState="RUNNING" />)
  const startButton = view.getByRole('button', { name: 'Start' })

  expect(startButton.hasAttribute('disabled')).toBe(true)
})

test('Plank start is disabled while deadhang is running', () => {
  const view = render(<App initialView="deadhang" />)
  const deadhangStartButton = view.getByRole('button', { name: 'Start' })
  fireEvent.click(deadhangStartButton)

  const plankTab = Array.from(view.container.querySelectorAll('button'))
    .find((button) => button.querySelector('.app-tabbar__label')?.textContent?.trim() === 'Plank')
  if (!plankTab) throw new Error('plank tab button not found')
  fireEvent.click(plankTab)

  const plankStartButton = view.getByRole('button', { name: 'Start' })
  expect(plankStartButton.hasAttribute('disabled')).toBe(true)
})

test('Complete click shows save feedback lifecycle for squat', async () => {
  const view = render(<App initialView="squat" />)
  const completeButton = view.getByRole('button', { name: 'Complete squats' })

  expect(view.queryByText('Saving...')).toBeNull()
  expect(view.queryByText('Saved just now')).toBeNull()

  fireEvent.click(completeButton)

  expect(view.getByText('Saving...')).toBeTruthy()
  await waitFor(() => {
    expect(view.getByText('Saved just now')).toBeTruthy()
  })
})

test('Input change save path does not show complete save feedback', async () => {
  const view = render(<App initialView="squat" />)
  const doneInput = view.container.querySelector('#squat-done-reps')
  if (!doneInput) throw new Error('squat done reps input not found')

  setNumberInputValue(doneInput, '8')

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.squat.actual_reps).toBe(8)
  })
  expect(view.queryByText('Saving...')).toBeNull()
  expect(view.queryByText('Saved just now')).toBeNull()
})

test('Pushup complete click also shows save feedback lifecycle', async () => {
  const view = render(<App initialView="pushup" />)
  const completeButton = view.getByRole('button', { name: 'Complete pushups' })

  fireEvent.click(completeButton)

  expect(view.getByText('Saving...')).toBeTruthy()
  await waitFor(() => {
    expect(view.getByText('Saved just now')).toBeTruthy()
  })
})

test('Save failure on complete shows inline error feedback', async () => {
  const originalSetItem = happyWindow.localStorage.setItem
  Object.defineProperty(happyWindow.localStorage, 'setItem', {
    configurable: true,
    value: () => {
      throw new Error('storage failed')
    },
  })

  try {
    const view = render(<App initialView="squat" />)
    const completeButton = view.getByRole('button', { name: 'Complete squats' })

    fireEvent.click(completeButton)

    await waitFor(() => {
      expect(view.getByText('Save failed. Try again.')).toBeTruthy()
    })
  } finally {
    Object.defineProperty(happyWindow.localStorage, 'setItem', {
      configurable: true,
      value: originalSetItem,
    })
  }
})

test('Partial today record without plank log keeps plank view in IDLE', () => {
  seedTodayRecord({
    plank: { target_sec: 60, actual_sec: 0, success: false },
    squat: { target_reps: 20, actual_reps: 12, success: false },
    pushup: { target_reps: 15, actual_reps: 0, success: false },
    deadhang: { target_sec: 30, actual_sec: 0, success: false },
  })

  const view = render(<App initialView="plank" />)

  expect(view.getByText('Start')).toBeTruthy()
  expect(view.queryByText('Cancel')).toBeNull()
})

test('Summary export navigates to shortcuts URL when today record exists', () => {
  seedTodayRecord()
  const view = render(<App initialView="summary" />)
  const button = view.getByRole('button', { name: 'Apple 건강에 기록' })

  fireEvent.click(button)

  expect(happyWindow.location.href.startsWith('shortcuts://x-callback-url/run-shortcut?')).toBe(true)
  const parsed = new URL(happyWindow.location.href)
  expect(parsed.searchParams.get('name')).toBe('DailyPlankSquatToHealth')
  expect(parsed.searchParams.get('input')).toBe('text')
  expect(parsed.searchParams.get('text')).toBeTruthy()
})

test('Summary export shows hint when opening Shortcuts throws', () => {
  seedTodayRecord({ flag_suspicious: true })
  const originalLocation = happyWindow.location

  Object.defineProperty(happyWindow, 'location', {
    configurable: true,
    value: {
      get href() {
        return originalLocation.href
      },
      set href(_value: string) {
        throw new Error('blocked')
      },
    },
  })

  try {
    const view = render(<App initialView="summary" />)
    const button = view.getByRole('button', { name: 'Apple 건강에 기록' })

    fireEvent.click(button)

    expect(view.getByText('Could not open Shortcuts. Check that Apple Shortcuts is available on this device.')).toBeTruthy()
  } finally {
    Object.defineProperty(happyWindow, 'location', {
      configurable: true,
      value: originalLocation,
    })
  }
})
