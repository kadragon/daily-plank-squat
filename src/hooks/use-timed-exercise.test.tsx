import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { Window } from 'happy-dom'
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

const originalFrameApi = {
  requestAnimationFrame: globalThis.requestAnimationFrame,
  cancelAnimationFrame: globalThis.cancelAnimationFrame,
}

beforeEach(() => {
  now = 1_000
  nowSpy = spyOn(performance, 'now').mockImplementation(() => now)
  // Frames never fire: each test drives the timer through explicit handler calls only.
  Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} })
})

afterEach(() => {
  cleanup()
  nowSpy?.mockRestore()
  Object.assign(globalThis, originalFrameApi)
})

function renderTimed(initial: { actualSec: number, success: boolean, logged: boolean }) {
  const persisted: number[] = []
  const view = renderHook(() => useTimedExercise({
    initialState: 'IDLE',
    initialActualSec: initial.actualSec,
    initialSuccess: initial.success,
    initialLogged: initial.logged,
    targetSec: 600,
    countdownSec: 0,
    otherTimerRunning: false,
    onProgressSeconds: () => {},
    requestPersist: () => { persisted.push(now) },
    setSuspiciousSession: () => {},
  }))
  return { view, persisted }
}

test('restarting keeps the earlier logged result while the new run is in progress', () => {
  const { view } = renderTimed({ actualSec: 60, success: true, logged: true })

  act(() => view.result.current.handleStart())

  expect(view.result.current.state).toBe('RUNNING')
  expect(view.result.current.result).toEqual({ actualSec: 60, success: true })
  expect(view.result.current.logged).toBe(true)
  expect(view.result.current.completedElapsedMsRef.current).toBe(60_000)
  expect(view.result.current.loggedVisibilityTrackerRef.current).not.toBe(view.result.current.visibilityTrackerRef.current)
})

test('cancelling a shorter rerun keeps the earlier result and its snapshot', () => {
  const { view, persisted } = renderTimed({ actualSec: 60, success: true, logged: true })
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
