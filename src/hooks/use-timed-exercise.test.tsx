import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { Window } from 'happy-dom'
import { getInactiveTimeRatio } from './use-visibility'
import { useTimedExercise } from './use-timed-exercise'

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
  })
}

let now = 0
let nowSpy: ReturnType<typeof spyOn> | null = null
let pendingFrames: FrameRequestCallback[] = []

function flushFrames() {
  const frames = pendingFrames
  pendingFrames = []
  act(() => { for (const frame of frames) frame(now) })
}

const originalFrameApi = {
  requestAnimationFrame: globalThis.requestAnimationFrame,
  cancelAnimationFrame: globalThis.cancelAnimationFrame,
}

beforeEach(() => {
  now = 1_000
  nowSpy = spyOn(performance, 'now').mockImplementation(() => now)
  // Frames fire only through flushFrames(), so each test controls when the running timer ticks.
  pendingFrames = []
  Object.assign(globalThis, {
    requestAnimationFrame: (callback: FrameRequestCallback) => pendingFrames.push(callback),
    cancelAnimationFrame: (id: number) => { pendingFrames[id - 1] = () => {} },
  })
})

afterEach(() => {
  cleanup()
  nowSpy?.mockRestore()
  Object.assign(globalThis, originalFrameApi)
})

function renderTimed(
  initial: { actualSec: number, success: boolean, logged: boolean, inactiveTimeRatio?: number },
  initialTargetSec = 600,
  countdownSec = 0,
) {
  const persisted: number[] = []
  const suspiciousResets: boolean[] = []
  const view = renderHook(({ targetSec }) => useTimedExercise({
    initialState: 'IDLE',
    initialActualSec: initial.actualSec,
    initialSuccess: initial.success,
    initialLogged: initial.logged,
    initialInactiveTimeRatio: initial.inactiveTimeRatio ?? 0,
    targetSec,
    countdownSec,
    otherTimerRunning: false,
    onProgressSeconds: () => {},
    requestPersist: () => { persisted.push(now) },
    setSuspiciousSession: (value) => { suspiciousResets.push(value) },
  }), { initialProps: { targetSec: initialTargetSec } })
  return { view, persisted, suspiciousResets }
}

test('restarting keeps the earlier logged result while the new run is in progress', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true }, 60)

  act(() => view.result.current.handleStart())

  expect(view.result.current.state).toBe('RUNNING')
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })
  expect(view.result.current.logged).toBe(true)
  expect(view.result.current.completedElapsedMsRef.current).toBe(60_000)
  expect(view.result.current.loggedVisibilityTrackerRef.current).not.toBe(view.result.current.visibilityTrackerRef.current)
})

test('cancelling a shorter rerun keeps the earlier result and its snapshot', () => {
  const { view, persisted } = renderTimed({ actualSec: 60, success: true, logged: true }, 60)
  const earlierTracker = view.result.current.loggedVisibilityTrackerRef.current

  act(() => view.result.current.handleStart())
  now += 10_000
  act(() => view.result.current.handleCancel())

  expect(view.result.current.state).toBe('CANCELLED')
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })
  expect(view.result.current.logged).toBe(true)
  expect(view.result.current.completedElapsedMsRef.current).toBe(60_000)
  expect(view.result.current.loggedVisibilityTrackerRef.current).toBe(earlierTracker)
  expect(persisted).toHaveLength(1)
})

test('cancelling a longer rerun replaces the earlier unsuccessful result', () => {
  const { view } = renderTimed({ actualSec: 20, success: false, logged: true })

  act(() => view.result.current.handleStart())
  now += 45_000
  act(() => view.result.current.handleCancel())

  expect(view.result.current.result).toEqual({ actualSec: 45, success: false })
  expect(view.result.current.completedElapsedMsRef.current).toBe(45_000)
  expect(view.result.current.loggedVisibilityTrackerRef.current).toBe(view.result.current.visibilityTrackerRef.current)
})

test('a first run that is cancelled is logged as before', () => {
  const { view } = renderTimed({ actualSec: 0, success: false, logged: false })

  act(() => view.result.current.handleStart())
  now += 5_000
  act(() => view.result.current.handleCancel())

  expect(view.result.current.result).toEqual({ actualSec: 5, success: false })
  expect(view.result.current.logged).toBe(true)
})

test('a kept earlier result keeps its suspicious flag when a rerun starts', () => {
  const kept = renderTimed({ actualSec: 60, success: true, logged: true })
  act(() => kept.view.result.current.handleStart())
  expect(kept.suspiciousResets).toEqual([])

  cleanup()
  const fresh = renderTimed({ actualSec: 0, success: false, logged: false })
  act(() => fresh.view.result.current.handleStart())
  expect(fresh.suspiciousResets).toEqual([false])
})

test('an earlier success under a lower target does not beat a longer rerun under the raised target', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true }, 90)

  act(() => view.result.current.handleStart())
  now += 70_000
  act(() => view.result.current.handleCancel())

  expect(view.result.current.result).toEqual({ actualSec: 70, success: false })
})

test('an earlier cancelled run that meets a lowered target loses to a successful rerun', () => {
  const { view } = renderTimed({ actualSec: 60, success: false, logged: true }, 50)

  act(() => view.result.current.handleStart())
  now += 50_000
  flushFrames()

  expect(view.result.current.state).toBe('COMPLETED')
  expect(view.result.current.result).toEqual({ actualSec: 50, success: true })
})

test('a kept earlier result is re-judged against a raised target', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true }, 90)

  act(() => view.result.current.handleStart())
  now += 50_000
  act(() => view.result.current.handleCancel())

  expect(view.result.current.result).toEqual({ actualSec: 60, success: false })
})

test('a rerun that reaches the target replaces an earlier unsuccessful result', () => {
  const { view, persisted } = renderTimed({ actualSec: 30, success: false, logged: true }, 45)
  const earlierTracker = view.result.current.loggedVisibilityTrackerRef.current

  act(() => view.result.current.handleStart())
  now += 20_000
  flushFrames()
  expect(view.result.current.result).toEqual({ actualSec: 30, success: false })

  now += 25_000
  flushFrames()

  expect(view.result.current.state).toBe('COMPLETED')
  expect(view.result.current.result).toEqual({ actualSec: 45, success: true })
  expect(view.result.current.completedElapsedMsRef.current).toBe(45_000)
  expect(view.result.current.loggedVisibilityTrackerRef.current).not.toBe(earlierTracker)
  expect(persisted).toHaveLength(1)
})

test('a rerun that is not better reports that the earlier result was kept', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true }, 60)
  expect(view.result.current.earlierResultKept).toBe(false)

  act(() => view.result.current.handleStart())
  now += 10_000
  act(() => view.result.current.handleCancel())
  expect(view.result.current.earlierResultKept).toBe(true)

  act(() => view.result.current.handleStart())
  expect(view.result.current.earlierResultKept).toBe(false)
})

test('a rerun that ties the earlier result does not report it as better', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true }, 60)

  act(() => view.result.current.handleStart())
  now += 60_000
  flushFrames()

  expect(view.result.current.state).toBe('COMPLETED')
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })
  expect(view.result.current.earlierResultKept).toBe(false)
})

test('a rerun that replaces the earlier result does not report it as kept', () => {
  const { view } = renderTimed({ actualSec: 20, success: false, logged: true })

  act(() => view.result.current.handleStart())
  now += 45_000
  act(() => view.result.current.handleCancel())

  expect(view.result.current.earlierResultKept).toBe(false)
})

test('a restored logged result keeps its stored inactive ratio for later persists', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true, inactiveTimeRatio: 0.7 }, 60)

  const ratio = getInactiveTimeRatio(
    view.result.current.loggedVisibilityTrackerRef.current,
    view.result.current.completedElapsedMsRef.current,
    now,
  )
  expect(ratio).toBeCloseTo(0.7)
})

test('a logged success is re-judged when the target is raised', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true }, 60)
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })

  view.rerender({ targetSec: 90 })
  expect(view.result.current.result).toEqual({ actualSec: 60, success: false })

  view.rerender({ targetSec: 60 })
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })
})

test('a logged cancelled run is not upgraded when the target is lowered', () => {
  const { view } = renderTimed({ actualSec: 50, success: false, logged: true }, 60)

  view.rerender({ targetSec: 45 })
  expect(view.result.current.result).toEqual({ actualSec: 50, success: false })
})

test('cancelling a rerun during its countdown reports that the earlier result was kept', () => {
  const { view, persisted } = renderTimed({ actualSec: 60, success: true, logged: true }, 60, 3)

  act(() => view.result.current.handleStart())
  expect(view.result.current.state).toBe('COUNTDOWN')
  act(() => view.result.current.handleCancel())

  expect(view.result.current.state).toBe('CANCELLED')
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })
  expect(view.result.current.earlierResultKept).toBe(true)
  expect(persisted).toEqual([])
})
