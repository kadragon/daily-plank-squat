import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
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

// Holds past the 600ms cancel threshold with real timers, then releases.
async function longPress(button: HTMLElement) {
  fireEvent.pointerDown(button, { pointerId: 7, button: 0, pointerType: 'touch' })
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 700)))
  fireEvent.pointerUp(button, { pointerId: 7, button: 0, pointerType: 'touch' })
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

function openDoneRepsEntry(view: ReturnType<typeof render>, idPrefix: string): HTMLInputElement {
  fireEvent.click(view.getByRole('button', { name: /^완료 횟수 \d+회/ }))
  const input = view.container.querySelector<HTMLInputElement>(`#${idPrefix}-done-reps`)
  if (!input) throw new Error(`${idPrefix} done reps input not found`)
  return input
}

function enterDoneReps(view: ReturnType<typeof render>, idPrefix: string, value: string) {
  const input = openDoneRepsEntry(view, idPrefix)
  setNumberInputValue(input, value)
  fireEvent.submit(input.form as HTMLFormElement)
}

function seedTodayRecord(overrides: Partial<DailyRecord> = {}) {
  const record: DailyRecord = {
    date: getTodayDateKey(),
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
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
    ...overrides,
  }

  happyWindow.localStorage.setItem('daily-records', JSON.stringify([record]))
}

test('Swipe left from plank moves to squat', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)

  expect(view.getByText('스쿼트 카운터')).toBeTruthy()
})

test('Swipe right on first tab is a no-op', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 120, 260)

  expect(view.getByText('플랭크 타이머')).toBeTruthy()
})

test('Swipe started from input does not navigate', () => {
  const view = render(<App initialView="squat" />)
  const doneInput = openDoneRepsEntry(view, 'squat')

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

  expect(view.getByText('스쿼트 카운터')).toBeTruthy()
})

function getTab(view: ReturnType<typeof render>, label: string): HTMLElement {
  const tab = Array.from(view.container.querySelectorAll<HTMLElement>('nav button'))
    .find((button) => button.querySelector('.app-tabbar__label')?.textContent?.trim() === label)
  if (!tab) throw new Error(`${label} tab button not found`)
  return tab
}

function getChip(view: ReturnType<typeof render>, label: string): HTMLElement {
  const chips = view.getByRole('group', { name: '운동 선택' })
  const chip = Array.from(chips.querySelectorAll<HTMLElement>('button'))
    .find((button) => button.textContent?.trim() === label)
  if (!chip) throw new Error(`${label} chip not found`)
  return chip
}

test('Tap navigation switches between the three tabs and updates active state', () => {
  const view = render(<App initialView="today" />)

  fireEvent.click(getTab(view, '기록'))
  expect(view.getByText('운동 통계')).toBeTruthy()
  expect(view.getByText('날짜별 기록')).toBeTruthy()
  expect(getTab(view, '기록').getAttribute('aria-current')).toBe('page')
  expect(getTab(view, '오늘 운동').getAttribute('aria-current')).toBeNull()

  fireEvent.click(getTab(view, '설정'))
  expect(view.getByRole('checkbox', { name: '플랭크 활성화' })).toBeTruthy()
  expect(getTab(view, '설정').getAttribute('aria-current')).toBe('page')

  fireEvent.click(getTab(view, '오늘 운동'))
  expect(view.getByRole('list', { name: '오늘 운동 목록' })).toBeTruthy()
  expect(getTab(view, '오늘 운동').getAttribute('aria-current')).toBe('page')
})

test('Card opens exercise detail, keeps today tab active, and back returns to the list', () => {
  const view = render(<App initialView="today" />)

  fireEvent.click(view.getByRole('button', { name: /^푸시업 열기/ }))
  expect(view.getByText('푸시업 카운터')).toBeTruthy()
  expect(getTab(view, '오늘 운동').getAttribute('aria-current')).toBe('page')

  fireEvent.click(view.getByRole('button', { name: '오늘 운동 목록으로 돌아가기' }))
  expect(view.queryByText('푸시업 카운터')).toBeNull()
  expect(view.getByRole('list', { name: '오늘 운동 목록' })).toBeTruthy()
})

test('Today tab tap from a detail view returns to the card list', () => {
  const view = render(<App initialView="plank" />)

  fireEvent.click(getTab(view, '오늘 운동'))

  expect(view.queryByText('플랭크 타이머')).toBeNull()
  expect(view.getByRole('list', { name: '오늘 운동 목록' })).toBeTruthy()
})

test('Exercise chip switches detail view and marks the chip pressed', () => {
  const view = render(<App initialView="plank" />)

  fireEvent.click(getChip(view, '데드행'))

  expect(view.getByText('데드행 타이머')).toBeTruthy()
  expect(getChip(view, '데드행').getAttribute('aria-pressed')).toBe('true')
  expect(getChip(view, '플랭크').getAttribute('aria-pressed')).toBe('false')
  expect(getTab(view, '오늘 운동').getAttribute('aria-current')).toBe('page')
})

test('Disabled exercises are excluded from cards and chips', () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ exercises: { pushup: { enabled: false } } }))
  const view = render(<App initialView="today" />)

  expect(view.queryByRole('button', { name: /^푸시업 열기/ })).toBeNull()
  expect(view.getByRole('button', { name: /^스쿼트 열기/ })).toBeTruthy()

  fireEvent.click(view.getByRole('button', { name: /^스쿼트 열기/ }))
  const chipLabels = Array.from(view.getByRole('group', { name: '운동 선택' }).querySelectorAll('button'))
    .map((button) => button.textContent?.trim())
  expect(chipLabels).toEqual(['플랭크', '스쿼트', '데드행', '덤벨 컬'])
})

test('initialView for a disabled exercise falls back to the today list', () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ exercises: { squat: { enabled: false } } }))
  const view = render(<App initialView="squat" />)

  expect(view.queryByText('스쿼트 카운터')).toBeNull()
  expect(view.getByRole('list', { name: '오늘 운동 목록' })).toBeTruthy()
})

test('Disabling an exercise in settings removes it from the today list', () => {
  const view = render(<App initialView="settings" />)

  fireEvent.click(view.getByRole('checkbox', { name: '덤벨 컬 활성화' }))
  fireEvent.click(getTab(view, '오늘 운동'))

  expect(view.queryByRole('button', { name: /^덤벨 컬 열기/ })).toBeNull()
  expect(view.getByText('0 / 4 완료')).toBeTruthy()
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

  expect(view.getByText('플랭크 타이머')).toBeTruthy()
})

test('Swipe on the today tab is a no-op', () => {
  const view = render(<App initialView="today" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)
  swipe(main, 120, 260)

  expect(view.getByRole('list', { name: '오늘 운동 목록' })).toBeTruthy()
})

test('Swipe left from the last enabled exercise does not move into history or settings', () => {
  const view = render(<App initialView="dumbbell" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)

  expect(view.getByText('덤벨 컬 카운터')).toBeTruthy()
  expect(view.queryByText('운동 통계')).toBeNull()
})

test('Swipe skips disabled exercises', () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ exercises: { squat: { enabled: false } } }))
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)

  expect(view.getByText('푸시업 카운터')).toBeTruthy()
})

test('Summary export button is disabled when there is no today record', () => {
  const view = render(<App initialView="today" />)
  const button = view.getByRole('button', { name: 'Apple 건강에 기록' })

  expect(button.hasAttribute('disabled')).toBe(true)
})

test('App does not persist any record on initial render without interaction', () => {
  render(<App initialView="squat" />)

  expect(readStoredRecords()).toHaveLength(0)
})

test('Changing squat done reps immediately saves today record', async () => {
  const view = render(<App initialView="squat" />)
  enterDoneReps(view, 'squat', '12')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.squat.actual_reps).toBe(12)
  })
})

test('Changing squat target reps in settings immediately saves today record', async () => {
  const view = render(<App initialView="settings" />)
  const targetInput = view.container.querySelector('#settings-target-squat')
  if (!targetInput) throw new Error('squat settings target input not found')

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
  enterDoneReps(view, 'pushup', '10')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.pushup.actual_reps).toBe(10)
  })
  enterDoneReps(view, 'pushup', '13')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.pushup.actual_reps).toBe(13)
  })
})

test('Changing pushup target reps in settings immediately saves today record', async () => {
  const view = render(<App initialView="settings" />)
  const targetInput = view.container.querySelector('#settings-target-pushup')
  if (!targetInput) throw new Error('pushup settings target input not found')

  setNumberInputValue(targetInput, '19')
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.pushup.target_reps).toBe(19)
  })
})

test('Tapping +1, +5 and −1 on the dumbbell screen updates the count and saves it', async () => {
  const view = render(<App initialView="dumbbell" />)

  fireEvent.click(view.getByRole('button', { name: '1회 추가' }))
  fireEvent.click(view.getByRole('button', { name: '5회 추가' }))
  fireEvent.click(view.getByRole('button', { name: '1회 추가' }))
  fireEvent.click(view.getByRole('button', { name: '1회 빼기' }))

  expect(view.getByRole('button', { name: /^완료 횟수 6회/ })).toBeTruthy()
  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.dumbbell.actual_reps).toBe(6)
  })
})

test('Squat complete shows recommendation', async () => {
  const view = render(<App initialView="squat" />)

  expect(view.container.querySelector('.recommendation-note')).toBeNull()
  fireEvent.click(view.getByRole('button', { name: '스쿼트 완료' }))

  await waitFor(() => {
    expect(view.container.querySelector('.recommendation-note')).toBeTruthy()
  })
})

test('Pushup complete shows recommendation', async () => {
  const view = render(<App initialView="pushup" />)

  expect(view.container.querySelector('.recommendation-note')).toBeNull()
  fireEvent.click(view.getByRole('button', { name: '푸시업 완료' }))

  await waitFor(() => {
    expect(view.container.querySelector('.recommendation-note')).toBeTruthy()
  })
})

test('Plank complete and cancel both save/update today record', async () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  const cancelView = render(<App initialView="plank" />)
  fireEvent.click(cancelView.getByRole('button', { name: '시작' }))
  await longPress(cancelView.getByRole('button', { name: '취소' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.plank.success).toBe(false)
  })

  cleanup()
  happyWindow.localStorage.clear()

  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  seedTodayRecord({
    plank: { target_sec: 0, actual_sec: 0, success: false },
    squat: { target_reps: 20, actual_reps: 12, success: false },
    pushup: { target_reps: 15, actual_reps: 10, success: false },
    deadhang: { target_sec: 30, actual_sec: 0, success: false },
  })

  const completeView = render(<App initialView="plank" />)
  fireEvent.click(completeView.getByRole('button', { name: '시작' }))

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.date).toBe(getTodayDateKey())
    expect(stored[0]?.plank.success).toBe(true)
  })
})

test('Deadhang start is disabled when plank is running', () => {
  const view = render(<App initialView="deadhang" initialPlankState="RUNNING" />)
  const startButton = view.getByRole('button', { name: '시작' })

  expect(startButton.hasAttribute('disabled')).toBe(true)
})

test('Plank start is disabled while deadhang is running', () => {
  const view = render(<App initialView="deadhang" />)
  const deadhangStartButton = view.getByRole('button', { name: '시작' })
  fireEvent.click(deadhangStartButton)

  fireEvent.click(getChip(view, '플랭크'))

  const plankStartButton = view.getByRole('button', { name: '시작' })
  expect(plankStartButton.hasAttribute('disabled')).toBe(true)
})

test('Complete click shows save feedback lifecycle for squat', async () => {
  const view = render(<App initialView="squat" />)
  const completeButton = view.getByRole('button', { name: '스쿼트 완료' })

  expect(view.queryByText('저장 중...')).toBeNull()
  expect(view.queryByText('방금 저장됨')).toBeNull()

  fireEvent.click(completeButton)

  expect(view.getByText('저장 중...')).toBeTruthy()
  await waitFor(() => {
    expect(view.getByText('방금 저장됨')).toBeTruthy()
  })
})

test('Input change save path does not show complete save feedback', async () => {
  const view = render(<App initialView="squat" />)
  enterDoneReps(view, 'squat', '8')

  await waitFor(() => {
    const stored = readStoredRecords()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.squat.actual_reps).toBe(8)
  })
  expect(view.queryByText('저장 중...')).toBeNull()
  expect(view.queryByText('방금 저장됨')).toBeNull()
})

test('Pushup complete click also shows save feedback lifecycle', async () => {
  const view = render(<App initialView="pushup" />)
  const completeButton = view.getByRole('button', { name: '푸시업 완료' })

  fireEvent.click(completeButton)

  expect(view.getByText('저장 중...')).toBeTruthy()
  await waitFor(() => {
    expect(view.getByText('방금 저장됨')).toBeTruthy()
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
    const completeButton = view.getByRole('button', { name: '스쿼트 완료' })

    fireEvent.click(completeButton)

    await waitFor(() => {
      expect(view.getByText('저장하지 못했습니다. 다시 시도하세요.')).toBeTruthy()
    })
  } finally {
    Object.defineProperty(happyWindow.localStorage, 'setItem', {
      configurable: true,
      value: originalSetItem,
    })
  }
})

test('In-progress squat draft with reps does not show recommendation on reload', () => {
  seedTodayRecord({
    squat: { target_reps: 20, actual_reps: 12, success: false },
    squat_completed: false,
  })

  const view = render(<App initialView="squat" />)

  expect(view.container.querySelector('.recommendation-note')).toBeNull()
})

test('Completed squat record shows recommendation on reload', () => {
  seedTodayRecord({
    squat: { target_reps: 20, actual_reps: 21, success: true },
    squat_completed: true,
  })

  const view = render(<App initialView="squat" />)

  expect(view.container.querySelector('.recommendation-note')).toBeTruthy()
})

test('In-progress pushup draft with reps does not show recommendation on reload', () => {
  seedTodayRecord({
    pushup: { target_reps: 15, actual_reps: 10, success: false },
    pushup_completed: false,
  })

  const view = render(<App initialView="pushup" />)

  expect(view.container.querySelector('.recommendation-note')).toBeNull()
})

test('Partial today record without plank log keeps plank view in IDLE', () => {
  seedTodayRecord({
    plank: { target_sec: 60, actual_sec: 0, success: false },
    squat: { target_reps: 20, actual_reps: 12, success: false },
    pushup: { target_reps: 15, actual_reps: 0, success: false },
    deadhang: { target_sec: 30, actual_sec: 0, success: false },
  })

  const view = render(<App initialView="plank" />)

  expect(view.getByText('시작')).toBeTruthy()
  expect(view.queryByText('취소')).toBeNull()
})

test('Summary export navigates to shortcuts URL when today record exists', () => {
  seedTodayRecord()
  const view = render(<App initialView="today" />)
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
    const view = render(<App initialView="today" />)
    const button = view.getByRole('button', { name: 'Apple 건강에 기록' })

    fireEvent.click(button)

    expect(view.getByText('단축어를 열 수 없습니다. 이 기기에서 Apple 단축어를 사용할 수 있는지 확인하세요.')).toBeTruthy()
  } finally {
    Object.defineProperty(happyWindow, 'location', {
      configurable: true,
      value: originalLocation,
    })
  }
})

test('Cancelled plank is not marked completed on the today card but shows its recommendation', async () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  const view = render(<App initialView="plank" />)
  fireEvent.click(view.getByRole('button', { name: '시작' }))
  await longPress(view.getByRole('button', { name: '취소' }))
  await waitFor(() => {
    expect(readStoredRecords()).toHaveLength(1)
  })

  fireEvent.click(view.getByRole('button', { name: '오늘 운동 목록으로 돌아가기' }))
  const plankCard = view.getByRole('button', { name: /^플랭크 열기/ })

  expect(plankCard.className).not.toContain('exercise-card--completed')
  expect(plankCard.getAttribute('aria-label')).toContain('내일 추천')
  expect(view.getByText('0 / 5 완료')).toBeTruthy()
})

test('Squat reaching target shows completed mark on the today card', () => {
  seedTodayRecord({
    squat: { target_reps: 20, actual_reps: 21, success: true },
    squat_completed: true,
  })
  const view = render(<App initialView="today" />)
  const squatCard = view.getByRole('button', { name: /^스쿼트 열기/ })

  expect(squatCard.className).toContain('exercise-card--completed')
})

test('Short tap on plank cancel while running keeps the session running', async () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  const view = render(<App initialView="plank" />)
  fireEvent.click(view.getByRole('button', { name: '시작' }))

  const cancel = view.getByRole('button', { name: '취소' })
  fireEvent.pointerDown(cancel, { pointerId: 7, button: 0, pointerType: 'touch' })
  fireEvent.pointerUp(cancel, { pointerId: 7, button: 0, pointerType: 'touch' })
  fireEvent.click(cancel)
  // Plain wait: the running timer keeps scheduling frames, so act() would never settle.
  await new Promise<void>((resolve) => setTimeout(resolve, 700))

  expect(view.getByRole('button', { name: '일시정지' })).toBeTruthy()
  expect(view.container.querySelector('.plank-timer--running')).toBeTruthy()
})

test('Dragging across the cancel button does not swipe to another exercise', () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  const view = render(<App initialView="plank" />)
  fireEvent.click(view.getByRole('button', { name: '시작' }))

  const main = view.container.querySelector('main') as HTMLElement
  fireEvent.pointerDown(view.getByRole('button', { name: '취소' }), { clientX: 300, clientY: 220, pointerId: 1, pointerType: 'touch' })
  fireEvent.pointerUp(main, { clientX: 40, clientY: 220, pointerId: 1, pointerType: 'touch' })

  expect(view.getByRole('heading', { name: '플랭크 타이머' })).toBeTruthy()
})

test('다음 운동 after a completed plank opens the next not-completed exercise', async () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  seedTodayRecord({
    plank: { target_sec: 0, actual_sec: 0, success: false },
    squat: { target_reps: 20, actual_reps: 21, success: true },
    pushup: { target_reps: 15, actual_reps: 10, success: false },
  })
  const view = render(<App initialView="plank" />)
  fireEvent.click(view.getByRole('button', { name: '시작' }))

  fireEvent.click(await view.findByRole('button', { name: '다음 운동' }))

  expect(view.getByRole('heading', { name: '푸시업 카운터' })).toBeTruthy()
})

test('다음 운동 after a cancelled plank returns to 오늘 운동 when every other exercise is done', async () => {
  happyWindow.localStorage.setItem('app-settings', JSON.stringify({ countdownSec: 0 }))
  seedTodayRecord({ plank: { target_sec: 60, actual_sec: 0, success: false } })
  const view = render(<App initialView="plank" />)
  fireEvent.click(view.getByRole('button', { name: '시작' }))
  await longPress(view.getByRole('button', { name: '취소' }))

  fireEvent.click(await view.findByRole('button', { name: '다음 운동' }))

  expect(view.getByRole('button', { name: /^플랭크 열기/ })).toBeTruthy()
  expect(view.queryByRole('heading', { name: '플랭크 타이머' })).toBeNull()
})
