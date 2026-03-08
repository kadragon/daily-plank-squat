import { useCallback, useEffect, useRef, useState } from 'react'
import { createVisibilityTracker, type VisibilityTracker } from './use-visibility'
import { createPlankTimer, type PlankTimer as DomainPlankTimer } from '../models/plank-timer'
import type { PlankState } from '../types'
import type { TimedWorkoutResult } from '../state/build-daily-record'

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

interface UseTimedExerciseOptions {
  initialState: PlankState
  initialActualSec: number
  initialSuccess: boolean
  initialLogged: boolean
  targetSec: number
  otherTimerRunning: boolean
  onProgressSeconds: (elapsedSec: number) => void
  onCompleted?: () => void
  requestPersist: () => void
  setSuspiciousSession: (value: boolean) => void
}

export interface UseTimedExerciseReturn {
  state: PlankState
  elapsedMs: number
  result: TimedWorkoutResult
  logged: boolean
  timerRef: React.RefObject<DomainPlankTimer | null>
  visibilityTrackerRef: React.RefObject<VisibilityTracker>
  completedElapsedMsRef: React.RefObject<number>
  syncState: (now?: number) => void
  handleStart: () => void
  handlePause: () => void
  handleResume: () => void
  handleCancel: () => void
}

export function useTimedExercise({
  initialState,
  initialActualSec,
  initialSuccess,
  initialLogged,
  targetSec,
  otherTimerRunning,
  onProgressSeconds,
  onCompleted,
  requestPersist,
  setSuspiciousSession,
}: UseTimedExerciseOptions): UseTimedExerciseReturn {
  const timerRef = useRef<DomainPlankTimer | null>(null)
  const visibilityTrackerRef = useRef(createVisibilityTracker())
  const completedElapsedMsRef = useRef(initialActualSec * 1000)

  if (timerRef.current === null) {
    timerRef.current = createPlankTimer()
  }

  const [state, setState] = useState<PlankState>(initialState)
  const [elapsedMs, setElapsedMs] = useState(initialActualSec * 1000)
  const [result, setResult] = useState<TimedWorkoutResult>({ actualSec: initialActualSec, success: initialSuccess })
  const [logged, setLogged] = useState(initialLogged)

  const syncState = useCallback((now = nowMs()) => {
    setState(timerRef.current?.state() ?? 'IDLE')
    setElapsedMs(timerRef.current?.getCurrentElapsed(now) ?? 0)
  }, [])

  const handleStart = useCallback(() => {
    if (otherTimerRunning) return
    visibilityTrackerRef.current = createVisibilityTracker()
    timerRef.current?.start(nowMs())
    setResult({ actualSec: 0, success: false })
    setLogged(false)
    setSuspiciousSession(false)
    completedElapsedMsRef.current = 0
    syncState()
  }, [otherTimerRunning, setSuspiciousSession, syncState])

  const handlePause = useCallback(() => {
    timerRef.current?.pause(nowMs())
    syncState()
  }, [syncState])

  const handleResume = useCallback(() => {
    timerRef.current?.resume(nowMs())
    syncState()
  }, [syncState])

  const handleCancel = useCallback(() => {
    const now = nowMs()
    const cancelResult = timerRef.current?.cancel(now)
    if (cancelResult) {
      const elapsed = timerRef.current?.getCurrentElapsed(now) ?? 0
      completedElapsedMsRef.current = elapsed
      setResult({ actualSec: cancelResult.actual_sec, success: false })
      setLogged(true)
      requestPersist()
    }
    syncState()
  }, [requestPersist, syncState])

  // Animation frame loop for running timer
  useEffect(() => {
    if (state !== 'RUNNING') return undefined

    let frameId = 0
    const tick = () => {
      const now = nowMs()
      const currentElapsed = timerRef.current?.getCurrentElapsed(now) ?? 0
      setElapsedMs(currentElapsed)
      onProgressSeconds(Math.floor(currentElapsed / 1000))

      if (currentElapsed >= targetSec * 1000) {
        const completeResult = timerRef.current?.complete(now)
        if (completeResult) {
          completedElapsedMsRef.current = timerRef.current?.getCurrentElapsed(now) ?? currentElapsed
          setResult({ actualSec: completeResult.actual_sec, success: completeResult.success })
          setLogged(true)
          onCompleted?.()
          requestPersist()
        }
        syncState(now)
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [state, targetSec, onProgressSeconds, onCompleted, requestPersist, syncState])

  return {
    state,
    elapsedMs,
    result,
    logged,
    timerRef,
    visibilityTrackerRef,
    completedElapsedMsRef,
    syncState,
    handleStart,
    handlePause,
    handleResume,
    handleCancel,
  }
}
