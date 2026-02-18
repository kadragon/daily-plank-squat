import type { PlankState } from '../types'

export interface VisibilityTracker {
  hiddenAt: number | null
}

export function createVisibilityTracker(): VisibilityTracker {
  return { hiddenAt: null }
}

export function onVisibilityChange({
  tracker,
  isHidden,
  plankState,
  now,
  elapsedMs,
}: {
  tracker: VisibilityTracker
  isHidden: boolean
  plankState: PlankState
  now: number
  elapsedMs: number
}): number {
  if (isHidden && plankState === 'RUNNING') {
    tracker.hiddenAt = now
    return elapsedMs
  }

  if (!isHidden && plankState === 'RUNNING' && tracker.hiddenAt !== null) {
    const restoredElapsed = elapsedMs + (now - tracker.hiddenAt)
    tracker.hiddenAt = null
    return restoredElapsed
  }

  return elapsedMs
}

export function useVisibility() {
  return createVisibilityTracker()
}
