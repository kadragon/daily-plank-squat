import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createVisibilityTracker, type VisibilityTracker } from './use-visibility'
import { createPlankTimer, type PlankTimer as DomainPlankTimer } from '../models/plank-timer'
import type { PlankState } from '../types'
import type { TimedWorkoutResult } from '../state/build-daily-record'
import { nowMs } from '../utils/now-ms'

interface UseTimedExerciseOptions {
  initialState: PlankState
  initialActualSec: number
  initialSuccess: boolean
  initialLogged: boolean
  initialInactiveTimeRatio: number
  targetSec: number
  countdownSec: number
  otherTimerRunning: boolean
  onProgressSeconds: (elapsedSec: number) => void
  onCompleted?: () => void
  requestPersist: () => void
  setSuspiciousSession: (value: boolean) => void
}

export interface UseTimedExerciseReturn {
  state: PlankState
  elapsedMs: number
  countdownMs: number
  result: TimedWorkoutResult
  logged: boolean
  earlierResultKept: boolean
  timerRef: React.RefObject<DomainPlankTimer | null>
  visibilityTrackerRef: React.RefObject<VisibilityTracker>
  loggedVisibilityTrackerRef: React.RefObject<VisibilityTracker>
  completedElapsedMsRef: React.RefObject<number>
  syncState: (now?: number) => void
  handleStart: () => void
  handlePause: () => void
  handleResume: () => void
  handleCancel: () => void
}

function judgeResult(result: TimedWorkoutResult, targetSec: number): TimedWorkoutResult {
  const success = result.actualSec >= targetSec
  return success === result.success ? result : { actualSec: result.actualSec, success }
}

function isBetterResult(next: TimedWorkoutResult, previous: TimedWorkoutResult): boolean {
  if (next.success !== previous.success) return next.success
  return next.actualSec > previous.actualSec
}

export function useTimedExercise({
  initialState,
  initialActualSec,
  initialSuccess,
  initialLogged,
  initialInactiveTimeRatio,
  targetSec,
  countdownSec,
  otherTimerRunning,
  onProgressSeconds,
  onCompleted,
  requestPersist,
  setSuspiciousSession,
}: UseTimedExerciseOptions): UseTimedExerciseReturn {
  const timerRef = useRef<DomainPlankTimer | null>(null)
  // A restored logged result has no live tracker; seed one with the stored ratio so later persists keep its flag.
  // The record keeps only the day's max ratio, so with both timed exercises logged each inherits it (over-flags).
  const visibilityTrackerRef = useRef<VisibilityTracker>({
    ...createVisibilityTracker(),
    hiddenDurationMs: initialLogged ? initialInactiveTimeRatio * initialActualSec * 1000 : 0,
  })
  // Tracker of the run behind `result`; `visibilityTrackerRef` moves on to a rerun as soon as it starts.
  const loggedVisibilityTrackerRef = useRef(visibilityTrackerRef.current)
  const completedElapsedMsRef = useRef(initialActualSec * 1000)

  if (timerRef.current === null) {
    timerRef.current = createPlankTimer()
  }

  const [state, setState] = useState<PlankState>(initialState)
  const [elapsedMs, setElapsedMs] = useState(initialActualSec * 1000)
  const [countdownMs, setCountdownMs] = useState(0)
  const countdownStartRef = useRef(0)
  const countdownDurationRef = useRef(0)
  const [result, setResult] = useState<TimedWorkoutResult>({ actualSec: initialActualSec, success: initialSuccess })
  const [logged, setLogged] = useState(initialLogged)
  const [earlierResultKept, setEarlierResultKept] = useState(false)
  // Result a rerun must not discard: kept unless the rerun ends with a better result.
  const previousResultRef = useRef<TimedWorkoutResult | null>(null)

  const syncState = useCallback((now = nowMs()) => {
    setState(timerRef.current?.state() ?? 'IDLE')
    setElapsedMs(timerRef.current?.getCurrentElapsed(now) ?? 0)
  }, [])

  const handleStart = useCallback(() => {
    if (otherTimerRunning) return
    previousResultRef.current = logged ? result : null
    setEarlierResultKept(false)
    visibilityTrackerRef.current = createVisibilityTracker()
    // A kept earlier result keeps its flag; the next persist recomputes it either way.
    if (!logged) setSuspiciousSession(false)
    if (countdownSec > 0) {
      const now = nowMs()
      timerRef.current?.startCountdown(now)
      countdownStartRef.current = now
      countdownDurationRef.current = countdownSec * 1000
      setCountdownMs(countdownSec * 1000)
    } else {
      timerRef.current?.start(nowMs())
    }
    syncState()
  }, [otherTimerRunning, logged, result, countdownSec, setSuspiciousSession, syncState])

  const logRun = useCallback((next: TimedWorkoutResult, elapsedMs: number) => {
    const stored = previousResultRef.current
    previousResultRef.current = null
    const previous = stored && judgeResult(stored, targetSec)
    if (previous && !isBetterResult(next, previous)) {
      // A tie keeps the earlier result too, but only a strictly better one is worth telling the user about.
      setEarlierResultKept(isBetterResult(previous, next))
      return
    }
    completedElapsedMsRef.current = elapsedMs
    loggedVisibilityTrackerRef.current = visibilityTrackerRef.current
    setResult(next)
    setLogged(true)
  }, [targetSec])

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
    const wasCountdown = timerRef.current?.state() === 'COUNTDOWN'
    const cancelResult = timerRef.current?.cancel(now)
    if (cancelResult && !wasCountdown) {
      const elapsed = timerRef.current?.getCurrentElapsed(now) ?? 0
      logRun({ actualSec: cancelResult.actual_sec, success: false }, elapsed)
      requestPersist()
    }
    syncState()
  }, [logRun, requestPersist, syncState])

  // Animation frame loop for countdown
  useEffect(() => {
    if (state !== 'COUNTDOWN') return undefined

    let frameId = 0
    const tick = () => {
      const now = nowMs()
      const elapsed = now - countdownStartRef.current
      const remaining = countdownDurationRef.current - elapsed

      if (remaining <= 0) {
        setCountdownMs(0)
        timerRef.current?.countdownDone(now)
        syncState(now)
        return
      }

      setCountdownMs(remaining)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [state, syncState])

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
          logRun(
            { actualSec: completeResult.actual_sec, success: completeResult.success },
            timerRef.current?.getCurrentElapsed(now) ?? currentElapsed,
          )
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
  }, [state, targetSec, onProgressSeconds, onCompleted, logRun, requestPersist, syncState])

  // A logged result is judged against the current target, which may have changed since it was logged.
  const judgedResult = useMemo(
    () => (logged ? judgeResult(result, targetSec) : result),
    [logged, result, targetSec],
  )

  return {
    state,
    elapsedMs,
    countdownMs,
    result: judgedResult,
    logged,
    earlierResultKept,
    timerRef,
    visibilityTrackerRef,
    loggedVisibilityTrackerRef,
    completedElapsedMsRef,
    syncState,
    handleStart,
    handlePause,
    handleResume,
    handleCancel,
  }
}
