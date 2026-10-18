import { useCallback, useRef, useState } from 'react'
import {
  complete as completeSquatCounter,
  createSquatCounter,
  sanitizeDoneReps,
  type SquatCounter as DomainSquatCounter,
} from '../models/squat-counter'
import { computeSquatSuccess } from '../state/initial-state'
import type { PersistReason } from '../state/build-daily-record'

export interface GoalAlertCallbacks {
  onProgress: (count: number, target: number) => void
}

export interface UseRepsExerciseOptions {
  initialCount: number
  initialTarget: number
  initialSuccess: boolean
  initialCompleted: boolean
  goalAlerts: GoalAlertCallbacks
  persistReason: PersistReason
  requestPersist: (reason?: PersistReason) => void
  onComplete: (finalCount: number, target: number) => void
}

export interface UseRepsExerciseReturn {
  count: number
  target: number
  success: boolean
  completed: boolean
  counterRef: React.RefObject<DomainSquatCounter | null>
  setTarget: (value: number) => void
  handleDoneRepsChange: (rawValue: string) => void
  handleComplete: () => void
}

export function useRepsExercise({
  initialCount,
  initialTarget,
  initialSuccess,
  initialCompleted,
  goalAlerts,
  persistReason,
  requestPersist,
  onComplete,
}: UseRepsExerciseOptions): UseRepsExerciseReturn {
  const counterRef = useRef<DomainSquatCounter | null>(null)
  if (counterRef.current === null) {
    counterRef.current = createSquatCounter()
    counterRef.current.count = initialCount
  }

  const [count, setCount] = useState(initialCount)
  const [target, setTarget] = useState(initialTarget)
  const [success, setSuccess] = useState(initialSuccess)
  const [completed, setCompleted] = useState(initialCompleted)

  const handleDoneRepsChange = useCallback((rawValue: string) => {
    const nextCount = sanitizeDoneReps(Number(rawValue))
    if (!counterRef.current) {
      console.error('[useRepsExercise] counterRef is null in handleDoneRepsChange — this should never happen')
    } else {
      counterRef.current.count = nextCount
    }
    setCount(nextCount)
    setSuccess(computeSquatSuccess(nextCount, target))
    goalAlerts.onProgress(nextCount, target)
    requestPersist()
  }, [target, goalAlerts, requestPersist])

  const updateTarget = useCallback((value: number) => {
    setTarget(value)
    setSuccess(computeSquatSuccess(count, value))
    goalAlerts.onProgress(count, value)
  }, [count, goalAlerts])

  const handleComplete = useCallback(() => {
    if (!counterRef.current) {
      console.error('[useRepsExercise] counterRef is null in handleComplete — this should never happen')
      return
    }
    // Read the ref, not `count`: a direct-entry draft committed in the same tap is not rendered yet.
    if (counterRef.current.count === 0) {
      counterRef.current.count = target
    }
    const finalCount = completeSquatCounter(counterRef.current)
    setCount(finalCount)
    goalAlerts.onProgress(finalCount, target)
    setSuccess(computeSquatSuccess(finalCount, target))
    setCompleted(true)
    onComplete(finalCount, target)
    requestPersist(persistReason)
  }, [target, goalAlerts, persistReason, requestPersist, onComplete])

  return {
    count,
    target,
    success,
    completed,
    counterRef,
    setTarget: updateTarget,
    handleDoneRepsChange,
    handleComplete,
  }
}
