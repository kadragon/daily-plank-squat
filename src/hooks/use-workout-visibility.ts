import { useEffect } from 'react'
import { onVisibilityChange, type VisibilityTracker } from './use-visibility'
import type { PlankState } from '../types'

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

interface TimedExerciseRef {
  visibilityTrackerRef: React.RefObject<VisibilityTracker>
  state: PlankState
  syncState: (now?: number) => void
}

export function useWorkoutVisibility(plank: TimedExerciseRef, deadhang: TimedExerciseRef): void {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const onChange = () => {
      const now = nowMs()
      onVisibilityChange({
        tracker: plank.visibilityTrackerRef.current,
        isHidden: document.hidden,
        timerState: plank.state,
        now,
      })
      onVisibilityChange({
        tracker: deadhang.visibilityTrackerRef.current,
        isHidden: document.hidden,
        timerState: deadhang.state,
        now,
      })

      if (!document.hidden) {
        plank.syncState(now)
        deadhang.syncState(now)
      }
    }

    document.addEventListener('visibilitychange', onChange)
    return () => {
      document.removeEventListener('visibilitychange', onChange)
    }
  }, [plank.state, deadhang.state, plank.visibilityTrackerRef, deadhang.visibilityTrackerRef, plank.syncState, deadhang.syncState])
}
