import type { PlankState } from '../types'

export interface VisibilityTracker {
  hiddenAt: number | null
  hiddenDurationMs: number
}

export function createVisibilityTracker(): VisibilityTracker {
  return {
    hiddenAt: null,
    hiddenDurationMs: 0,
  }
}

export function onVisibilityChange({
  tracker,
  isHidden,
  timerState,
  now,
}: {
  tracker: VisibilityTracker
  isHidden: boolean
  timerState: PlankState
  now: number
}): void {
  if (timerState !== 'RUNNING') return

  if (isHidden && tracker.hiddenAt === null) {
    tracker.hiddenAt = now
    return
  }

  if (!isHidden && tracker.hiddenAt !== null) {
    tracker.hiddenDurationMs += Math.max(0, now - tracker.hiddenAt)
    tracker.hiddenAt = null
  }
}

export function getInactiveTimeRatio(tracker: VisibilityTracker, totalDurationMs: number, now: number): number {
  const inFlightHidden = tracker.hiddenAt === null ? 0 : Math.max(0, now - tracker.hiddenAt)
  const hiddenTotal = tracker.hiddenDurationMs + inFlightHidden
  if (totalDurationMs <= 0) return 0
  return Math.min(1, hiddenTotal / totalDurationMs)
}

export function useVisibility() {
  return createVisibilityTracker()
}
