import { describe, test, expect } from 'bun:test'
import { createTimer, getElapsed, getCurrentElapsed, startTimer, pauseTimer, resumeTimer, completeTimer } from './timer'

describe('Timer Model', () => {
  test('elapsed is 0 before start', () => {
    const timer = createTimer()
    expect(getElapsed(timer)).toBe(0)
  })

  test('elapsed accumulates between start and pause via performance.now()', () => {
    const t0 = performance.now()
    const timer = createTimer()
    startTimer(timer, t0)
    pauseTimer(timer, t0 + 2000)
    expect(getElapsed(timer)).toBeCloseTo(2000)
  })

  test('getCurrentElapsed returns live value including current segment', () => {
    const timer = createTimer()
    startTimer(timer, 1000)
    pauseTimer(timer, 2000)   // closed: 1000ms
    resumeTimer(timer, 3000)  // open segment starts
    expect(getCurrentElapsed(timer, 3500)).toBe(1500)
  })

  test('elapsed stops after complete', () => {
    const t0 = performance.now()
    const timer = createTimer()
    startTimer(timer, t0)
    completeTimer(timer, t0 + 3000)
    expect(getElapsed(timer)).toBeCloseTo(3000)
  })

  test('elapsed preserves across pause/resume cycles', () => {
    const t0 = performance.now()
    const timer = createTimer()
    startTimer(timer, t0)
    pauseTimer(timer, t0 + 1000)   // 1s segment
    resumeTimer(timer, t0 + 2000)
    pauseTimer(timer, t0 + 3500)   // 1.5s segment
    expect(getElapsed(timer)).toBeCloseTo(2500)
  })

  test('60-second session keeps computed elapsed within ±1 second tolerance', () => {
    const timer = createTimer()
    startTimer(timer, 0)
    completeTimer(timer, 60_450)

    const elapsedSec = getElapsed(timer) / 1000
    expect(elapsedSec).toBeGreaterThanOrEqual(59)
    expect(elapsedSec).toBeLessThanOrEqual(61)
  })

  test('background-style long gap still preserves cumulative elapsed accuracy', () => {
    const timer = createTimer()
    startTimer(timer, 1_000)

    // Simulate hidden/foreground gap without relying on interval ticks.
    expect(getCurrentElapsed(timer, 6_000)).toBe(5_000)
    expect(getCurrentElapsed(timer, 16_000)).toBe(15_000)
  })
})
