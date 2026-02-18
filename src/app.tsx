import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DailySummary from './components/daily-summary'
import PlankTimer from './components/plank-timer'
import SquatCounter from './components/squat-counter'
import { getInactiveTimeRatio, onVisibilityChange, createVisibilityTracker } from './hooks/use-visibility'
import { getWakeLock, syncWakeLock, type WakeLockSentinelLike } from './hooks/use-wake-lock'
import {
  computeLatestFatigueSnapshot,
  computeTomorrowPlan,
} from './models/fatigue'
import { createGoalAlerts, playGoalFeedback } from './models/goal-alerts'
import { createPlankTimer, type PlankTimer as DomainPlankTimer } from './models/plank-timer'
import {
  complete as completeSquatCounter,
  createSquatCounter,
  sanitizeDoneReps,
  sanitizeTargetReps,
  type SquatCounter as DomainSquatCounter,
} from './models/squat-counter'
import { loadAllRecords, saveRecord } from './storage/daily-record'
import type { BaseTargets, DailyRecord, FatigueParams, PlankState } from './types'

type AppView = 'plank' | 'squat' | 'summary'

interface AppProps {
  initialView?: AppView
  initialPlankState?: PlankState
  initialWakeLockNotice?: string
}

interface InitialAppState {
  records: DailyRecord[]
  plankTargetSec: number
  squatTargetReps: number
  plankActualSec: number
  plankSuccess: boolean
  squatActualReps: number
  squatSuccess: boolean
  fatigue: number
  overloadWarning: boolean
  suspiciousSession: boolean
  tomorrowPlankTargetSec: number
  tomorrowSquatTargetReps: number
  plankState: PlankState
  alreadySavedToday: boolean
}

const BASE_TARGETS: BaseTargets = {
  base_P: 60,
  base_S: 20,
}

const DEFAULT_PARAMS: FatigueParams = {
  age: 30,
  weight_kg: 70,
  gender: 'other',
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function createInitialAppState(initialPlankState?: PlankState): InitialAppState {
  const records = loadAllRecords()
  const today = todayKey()
  const todayRecord = records.find((record) => record.date === today) ?? null
  const historyBeforeToday = records.filter((record) => record.date < today)

  const todayTargets = todayRecord
    ? {
      plank_target_sec: todayRecord.plank.target_sec,
      squat_target_reps: todayRecord.squat.target_reps,
      fatigue: todayRecord.fatigue,
    }
    : computeTomorrowPlan(historyBeforeToday, DEFAULT_PARAMS, BASE_TARGETS)

  const tomorrowPlan = computeTomorrowPlan(records, DEFAULT_PARAMS, BASE_TARGETS)

  return {
    records,
    plankTargetSec: todayTargets.plank_target_sec,
    squatTargetReps: todayTargets.squat_target_reps,
    plankActualSec: todayRecord?.plank.actual_sec ?? 0,
    plankSuccess: todayRecord?.plank.success ?? false,
    squatActualReps: todayRecord?.squat.actual_reps ?? 0,
    squatSuccess: todayRecord?.squat.success ?? false,
    fatigue: todayRecord?.fatigue ?? todayTargets.fatigue,
    overloadWarning: todayRecord ? tomorrowPlan.overload_warning : false,
    suspiciousSession: todayRecord?.flag_suspicious ?? false,
    tomorrowPlankTargetSec: tomorrowPlan.plank_target_sec,
    tomorrowSquatTargetReps: tomorrowPlan.squat_target_reps,
    plankState: initialPlankState ?? (todayRecord ? (todayRecord.plank.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE'),
    alreadySavedToday: todayRecord !== null,
  }
}

export default function App({ initialView = 'plank', initialPlankState, initialWakeLockNotice }: AppProps) {
  const initial = useRef(createInitialAppState(initialPlankState)).current
  const today = useMemo(() => todayKey(), [])

  const plankTimerRef = useRef<DomainPlankTimer | null>(null)
  const squatCounterRef = useRef<DomainSquatCounter | null>(null)
  const visibilityTrackerRef = useRef(createVisibilityTracker())
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null)
  const goalAlertsRef = useRef(createGoalAlerts(() => playGoalFeedback()))
  const savedTodayRef = useRef(initial.alreadySavedToday)
  const completedElapsedMsRef = useRef(initial.plankActualSec * 1000)

  if (plankTimerRef.current === null) {
    plankTimerRef.current = createPlankTimer()
  }
  if (squatCounterRef.current === null) {
    squatCounterRef.current = createSquatCounter()
    squatCounterRef.current.count = initial.squatActualReps
  }

  const [records, setRecords] = useState<DailyRecord[]>(initial.records)
  const [view, setView] = useState<AppView>(initialView)
  const [plankState, setPlankState] = useState<PlankState>(initial.plankState)
  const [elapsedMs, setElapsedMs] = useState(initial.plankActualSec * 1000)
  const [plankResult, setPlankResult] = useState({ actualSec: initial.plankActualSec, success: initial.plankSuccess })
  const [plankLogged, setPlankLogged] = useState(initial.alreadySavedToday)

  const [squatCount, setSquatCount] = useState(initial.squatActualReps)
  const [squatLogged, setSquatLogged] = useState(initial.alreadySavedToday)
  const [squatSuccess, setSquatSuccess] = useState(initial.squatSuccess)

  const [plankTargetSec] = useState(initial.plankTargetSec)
  const [squatTargetReps, setSquatTargetReps] = useState(initial.squatTargetReps)
  const [fatigue, setFatigue] = useState(initial.fatigue)
  const [overloadWarning, setOverloadWarning] = useState(initial.overloadWarning)
  const [suspiciousSession, setSuspiciousSession] = useState(initial.suspiciousSession)
  const [wakeLockNotice, setWakeLockNotice] = useState(initialWakeLockNotice ?? '')
  const [tomorrowTargets, setTomorrowTargets] = useState({
    plank: initial.tomorrowPlankTargetSec,
    squat: initial.tomorrowSquatTargetReps,
  })

  const syncPlankState = useCallback((now = nowMs()) => {
    setPlankState(plankTimerRef.current?.state() ?? 'IDLE')
    setElapsedMs(plankTimerRef.current?.getCurrentElapsed(now) ?? 0)
  }, [])

  function handlePlankStart() {
    visibilityTrackerRef.current = createVisibilityTracker()
    savedTodayRef.current = false
    plankTimerRef.current?.start(nowMs())
    setPlankResult({ actualSec: 0, success: false })
    setPlankLogged(false)
    setSuspiciousSession(false)
    completedElapsedMsRef.current = 0
    syncPlankState()
  }

  function handlePlankPause() {
    plankTimerRef.current?.pause(nowMs())
    syncPlankState()
  }

  function handlePlankResume() {
    plankTimerRef.current?.resume(nowMs())
    syncPlankState()
  }

  function handlePlankCancel() {
    const now = nowMs()
    const result = plankTimerRef.current?.cancel(now)
    if (result) {
      const elapsed = plankTimerRef.current?.getCurrentElapsed(now) ?? 0
      completedElapsedMsRef.current = elapsed
      setPlankResult({ actualSec: result.actual_sec, success: false })
      setPlankLogged(true)
    }
    syncPlankState()
  }

  function handleSquatDoneRepsChange(rawValue: string) {
    const nextCount = sanitizeDoneReps(Number(rawValue))
    if (squatCounterRef.current) {
      squatCounterRef.current.count = nextCount
    }
    setSquatCount(nextCount)
    goalAlertsRef.current.onSquatProgress(nextCount, squatTargetReps)
  }

  function handleSquatTargetRepsChange(rawValue: string) {
    const nextTarget = sanitizeTargetReps(Number(rawValue))
    setSquatTargetReps(nextTarget)
    goalAlertsRef.current.onSquatProgress(squatCount, nextTarget)
  }

  function handleSquatComplete() {
    const finalCount = completeSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatCount(finalCount)
    goalAlertsRef.current.onSquatProgress(finalCount, squatTargetReps)
    setSquatSuccess(finalCount >= squatTargetReps)
    setSquatLogged(true)
  }

  useEffect(() => {
    if (plankState !== 'RUNNING') return undefined

    let frameId = 0
    const tick = () => {
      const now = nowMs()
      const currentElapsed = plankTimerRef.current?.getCurrentElapsed(now) ?? 0
      setElapsedMs(currentElapsed)

      goalAlertsRef.current.onPlankProgress(Math.floor(currentElapsed / 1000), plankTargetSec)

      if (currentElapsed >= plankTargetSec * 1000) {
        const result = plankTimerRef.current?.complete(now)
        if (result) {
          completedElapsedMsRef.current = plankTimerRef.current?.getCurrentElapsed(now) ?? currentElapsed
          setPlankResult({ actualSec: result.actual_sec, success: true })
          setPlankLogged(true)
        }
        syncPlankState(now)
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [plankState, plankTargetSec, syncPlankState])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const onChange = () => {
      onVisibilityChange({
        tracker: visibilityTrackerRef.current,
        isHidden: document.hidden,
        plankState,
        now: nowMs(),
      })

      if (!document.hidden) {
        setElapsedMs(plankTimerRef.current?.getCurrentElapsed(nowMs()) ?? 0)
      }
    }

    document.addEventListener('visibilitychange', onChange)
    return () => {
      document.removeEventListener('visibilitychange', onChange)
    }
  }, [plankState])

  useEffect(() => {
    let isDisposed = false
    const wakeLock = getWakeLock()

    async function sync() {
      try {
        const next = await syncWakeLock(plankState, wakeLockSentinelRef.current, wakeLock)
        if (!isDisposed) {
          wakeLockSentinelRef.current = next
          if (plankState === 'RUNNING' && !wakeLock) {
            setWakeLockNotice('Wake Lock is not supported on this device. Keep the screen on manually.')
          } else {
            setWakeLockNotice('')
          }
        }
      } catch {
        if (!isDisposed && plankState === 'RUNNING') {
          setWakeLockNotice('Wake Lock could not be acquired. Keep the screen on manually.')
        }
      }
    }

    void sync()
    return () => {
      isDisposed = true
    }
  }, [plankState])

  useEffect(() => {
    if (!plankLogged || !squatLogged || savedTodayRef.current) return

    const sessionElapsedMs = completedElapsedMsRef.current || plankResult.actualSec * 1000
    const inactiveTimeRatio = getInactiveTimeRatio(visibilityTrackerRef.current, sessionElapsedMs, nowMs())
    const flagSuspicious = inactiveTimeRatio > 0.5

    const draftRecord: DailyRecord = {
      date: today,
      plank: {
        target_sec: plankTargetSec,
        actual_sec: plankResult.actualSec,
        success: plankResult.success,
      },
      squat: {
        target_reps: squatTargetReps,
        actual_reps: squatCount,
        success: squatSuccess,
      },
      fatigue: 0,
      F_P: 0,
      F_S: 0,
      F_total_raw: 0,
      inactive_time_ratio: inactiveTimeRatio,
      flag_suspicious: flagSuspicious,
    }

    const withoutToday = records.filter((record) => record.date !== today)
    const merged = [...withoutToday, draftRecord]
    const snapshot = computeLatestFatigueSnapshot(merged, DEFAULT_PARAMS, BASE_TARGETS)
    const finalRecord: DailyRecord = {
      ...draftRecord,
      fatigue: snapshot.fatigue,
      F_P: snapshot.F_P,
      F_S: snapshot.F_S,
      F_total_raw: snapshot.F_total_raw,
    }

    saveRecord(finalRecord)

    const nextRecords = [...withoutToday, finalRecord].toSorted((a, b) => a.date.localeCompare(b.date))
    const tomorrowPlan = computeTomorrowPlan(nextRecords, DEFAULT_PARAMS, BASE_TARGETS)

    savedTodayRef.current = true
    setRecords(nextRecords)
    setFatigue(finalRecord.fatigue)
    setOverloadWarning(tomorrowPlan.overload_warning)
    setSuspiciousSession(flagSuspicious)
    setTomorrowTargets({
      plank: tomorrowPlan.plank_target_sec,
      squat: tomorrowPlan.squat_target_reps,
    })
  }, [plankLogged, squatLogged, records, today, plankTargetSec, squatTargetReps, plankResult, squatCount, squatSuccess])

  function renderView() {
    switch (view) {
      case 'plank':
        return (
          <>
            <PlankTimer
              elapsedMs={elapsedMs}
              targetSec={plankTargetSec}
              state={plankState}
              onStart={handlePlankStart}
              onPause={handlePlankPause}
              onResume={handlePlankResume}
              onCancel={handlePlankCancel}
            />
            {wakeLockNotice ? <div className="wake-lock-notice">{wakeLockNotice}</div> : null}
          </>
        )
      case 'squat':
        return (
          <SquatCounter
            count={squatCount}
            targetReps={squatTargetReps}
            onDoneRepsChange={handleSquatDoneRepsChange}
            onTargetRepsChange={handleSquatTargetRepsChange}
            onComplete={handleSquatComplete}
          />
        )
      case 'summary':
        return (
          <DailySummary
            plankTargetSec={plankTargetSec}
            squatTargetReps={squatTargetReps}
            tomorrowPlankTargetSec={tomorrowTargets.plank}
            tomorrowSquatTargetReps={tomorrowTargets.squat}
            plankSuccess={plankResult.success}
            squatSuccess={squatSuccess}
            fatigue={fatigue}
            overloadWarning={overloadWarning}
            suspiciousSession={suspiciousSession}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      <h1 className="app-title">Daily Plank & Squat</h1>
      <nav className="nav">
        <button
          type="button"
          className={`nav-btn${view === 'plank' ? ' nav-btn--active' : ''}`}
          aria-current={view === 'plank' ? 'page' : undefined}
          onClick={() => setView('plank')}
        >
          Plank
        </button>
        <button
          type="button"
          className={`nav-btn${view === 'squat' ? ' nav-btn--active' : ''}`}
          aria-current={view === 'squat' ? 'page' : undefined}
          onClick={() => setView('squat')}
        >
          Squat
        </button>
        <button
          type="button"
          className={`nav-btn${view === 'summary' ? ' nav-btn--active' : ''}`}
          aria-current={view === 'summary' ? 'page' : undefined}
          onClick={() => setView('summary')}
        >
          Summary
        </button>
      </nav>
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  )
}
