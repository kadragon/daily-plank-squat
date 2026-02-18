import { expect, test } from 'bun:test'
import { createVisibilityTracker, onVisibilityChange } from './use-visibility'

test('visibilitychange hidden during RUNNING stores timestamp', () => {
  const tracker = createVisibilityTracker()

  onVisibilityChange({
    tracker,
    isHidden: true,
    plankState: 'RUNNING',
    now: 1000,
    elapsedMs: 5000,
  })

  expect(tracker.hiddenAt).toBe(1000)
})

test('visibilitychange visible restores elapsed correctly', () => {
  const tracker = createVisibilityTracker()
  onVisibilityChange({
    tracker,
    isHidden: true,
    plankState: 'RUNNING',
    now: 1000,
    elapsedMs: 5000,
  })

  const restoredElapsed = onVisibilityChange({
    tracker,
    isHidden: false,
    plankState: 'RUNNING',
    now: 2500,
    elapsedMs: 5000,
  })

  expect(restoredElapsed).toBe(6500)
  expect(tracker.hiddenAt).toBeNull()
})
