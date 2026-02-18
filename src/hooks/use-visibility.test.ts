import { expect, test } from 'bun:test'
import { createVisibilityTracker, getInactiveTimeRatio, onVisibilityChange } from './use-visibility'

test('visibilitychange hidden during RUNNING stores timestamp', () => {
  const tracker = createVisibilityTracker()

  onVisibilityChange({
    tracker,
    isHidden: true,
    plankState: 'RUNNING',
    now: 1000,
  })

  expect(tracker.hiddenAt).toBe(1000)
})

test('visibilitychange visible accumulates hidden duration', () => {
  const tracker = createVisibilityTracker()
  onVisibilityChange({
    tracker,
    isHidden: true,
    plankState: 'RUNNING',
    now: 1000,
  })

  onVisibilityChange({
    tracker,
    isHidden: false,
    plankState: 'RUNNING',
    now: 2500,
  })

  expect(tracker.hiddenDurationMs).toBe(1500)
  expect(tracker.hiddenAt).toBeNull()
})

test('inactive ratio includes in-flight hidden duration', () => {
  const tracker = createVisibilityTracker()
  onVisibilityChange({
    tracker,
    isHidden: true,
    plankState: 'RUNNING',
    now: 1000,
  })

  const ratio = getInactiveTimeRatio(tracker, 4000, 3000)
  expect(ratio).toBeCloseTo(0.5)
})
