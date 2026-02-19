import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import DailySummary from './components/daily-summary'
import PlankTimer from './components/plank-timer'
import RepsCounter from './components/reps-counter'
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
import { detectSwipeDirection, getAdjacentView } from './models/swipe-navigation'
import { loadAllRecords, saveRecord } from './storage/daily-record'
import { buildHealthPayload, buildShortcutRunUrl } from './integrations/apple-health-shortcut'
import type { BaseTargets, DailyRecord, FatigueParams, PlankState } from './types'

type AppView = 'plank' | 'squat' | 'pushup' | 'summary'

interface NavItemMeta {
  view: AppView
  label: string
}

interface AppProps {
  initialView?: AppView
  initialPlankState?: PlankState
  initialWakeLockNotice?: string
}

interface InitialAppState {
  records: DailyRecord[]
  plankTargetSec: number
  squatTargetReps: number
  pushupTargetReps: number
  plankActualSec: number
  plankSuccess: boolean
  squatActualReps: number
  squatSuccess: boolean
  pushupActualReps: number
  pushupSuccess: boolean
  fatigue: number
  overloadWarning: boolean
  suspiciousSession: boolean
  tomorrowPlankTargetSec: number
  tomorrowSquatTargetReps: number
  tomorrowPushupTargetReps: number
  plankState: PlankState
  alreadySavedToday: boolean
}

const BASE_TARGETS: BaseTargets = {
  base_P: 60,
  base_S: 20,
  base_U: 15,
}

const DEFAULT_PARAMS: FatigueParams = {
  age: 30,
  weight_kg: 70,
  gender: 'other',
}

const NAV_VIEWS = ['plank', 'squat', 'pushup', 'summary'] as const satisfies readonly AppView[]

const NAV_ITEMS: readonly NavItemMeta[] = [
  { view: 'plank', label: 'Plank' },
  { view: 'squat', label: 'Squat' },
  { view: 'pushup', label: 'Pushup' },
  { view: 'summary', label: 'Summary' },
]

const APPLE_HEALTH_SHORTCUT_NAME = 'DailyPlankSquatToHealth'
const HEALTH_EXPORT_ERROR_HINT = 'Could not open Shortcuts. Check that Apple Shortcuts is available on this device.'
const SUSPICIOUS_EXPORT_HINT = '기록은 가능하지만 측정 환경 경고'

function isWorkoutView(view: AppView): boolean {
  return view === 'plank' || view === 'squat' || view === 'pushup'
}

function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input,button,label,textarea,select,a,[data-swipe-ignore="true"]') !== null
}

function TabIcon({ view }: { view: AppView }) {
  switch (view) {
    case 'plank':
      return (
        <svg className="app-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 12L12 8M12 12L15 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'squat':
      return (
        <svg className="app-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="6" r="2" fill="currentColor" />
          <path d="M8 11H16M8 11L6 16M16 11L18 16M9 16H15M9 16L8 20M15 16L16 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'pushup':
      return (
        <svg className="app-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 16H20M7 12H17M8 12L10 8H14L16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'summary':
      return (
        <svg className="app-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 19V11M12 19V5M18 19V14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function computeSquatSuccess(actualReps: number, targetReps: number): boolean {
  return actualReps >= targetReps
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
      pushup_target_reps: todayRecord.pushup.target_reps,
      fatigue: todayRecord.fatigue,
    }
    : computeTomorrowPlan(historyBeforeToday, DEFAULT_PARAMS, BASE_TARGETS)

  const tomorrowPlan = computeTomorrowPlan(records, DEFAULT_PARAMS, BASE_TARGETS)

  return {
    records,
    plankTargetSec: todayTargets.plank_target_sec,
    squatTargetReps: todayTargets.squat_target_reps,
    pushupTargetReps: todayTargets.pushup_target_reps,
    plankActualSec: todayRecord?.plank.actual_sec ?? 0,
    plankSuccess: todayRecord?.plank.success ?? false,
    squatActualReps: todayRecord?.squat.actual_reps ?? 0,
    squatSuccess: todayRecord?.squat.success ?? false,
    pushupActualReps: todayRecord?.pushup.actual_reps ?? 0,
    pushupSuccess: todayRecord?.pushup.success ?? false,
    fatigue: todayRecord?.fatigue ?? todayTargets.fatigue,
    overloadWarning: todayRecord ? tomorrowPlan.overload_warning : false,
    suspiciousSession: todayRecord?.flag_suspicious ?? false,
    tomorrowPlankTargetSec: tomorrowPlan.plank_target_sec,
    tomorrowSquatTargetReps: tomorrowPlan.squat_target_reps,
    tomorrowPushupTargetReps: tomorrowPlan.pushup_target_reps,
    plankState: initialPlankState ?? (todayRecord ? (todayRecord.plank.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE'),
    alreadySavedToday: todayRecord !== null,
  }
}

export default function App({ initialView = 'plank', initialPlankState, initialWakeLockNotice }: AppProps) {
  const initial = useRef(createInitialAppState(initialPlankState)).current
  const today = useMemo(() => todayKey(), [])

  const plankTimerRef = useRef<DomainPlankTimer | null>(null)
  const squatCounterRef = useRef<DomainSquatCounter | null>(null)
  const pushupCounterRef = useRef<DomainSquatCounter | null>(null)
  const visibilityTrackerRef = useRef(createVisibilityTracker())
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null)
  const goalAlertsRef = useRef(createGoalAlerts(() => playGoalFeedback()))
  const savedTodayRef = useRef(initial.alreadySavedToday)
  const completedElapsedMsRef = useRef(initial.plankActualSec * 1000)
  const swipeStartRef = useRef<{ x: number, y: number, pointerId: number, ignore: boolean } | null>(null)

  if (plankTimerRef.current === null) {
    plankTimerRef.current = createPlankTimer()
  }
  if (squatCounterRef.current === null) {
    squatCounterRef.current = createSquatCounter()
    squatCounterRef.current.count = initial.squatActualReps
  }
  if (pushupCounterRef.current === null) {
    pushupCounterRef.current = createSquatCounter()
    pushupCounterRef.current.count = initial.pushupActualReps
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

  const [pushupCount, setPushupCount] = useState(initial.pushupActualReps)
  const [pushupLogged, setPushupLogged] = useState(initial.alreadySavedToday)
  const [pushupSuccess, setPushupSuccess] = useState(initial.pushupSuccess)

  const [plankTargetSec] = useState(initial.plankTargetSec)
  const [squatTargetReps, setSquatTargetReps] = useState(initial.squatTargetReps)
  const [pushupTargetReps, setPushupTargetReps] = useState(initial.pushupTargetReps)
  const [fatigue, setFatigue] = useState(initial.fatigue)
  const [overloadWarning, setOverloadWarning] = useState(initial.overloadWarning)
  const [suspiciousSession, setSuspiciousSession] = useState(initial.suspiciousSession)
  const [wakeLockNotice, setWakeLockNotice] = useState(initialWakeLockNotice ?? '')
  const [healthExportHint, setHealthExportHint] = useState('')
  const [tomorrowTargets, setTomorrowTargets] = useState({
    plank: initial.tomorrowPlankTargetSec,
    squat: initial.tomorrowSquatTargetReps,
    pushup: initial.tomorrowPushupTargetReps,
  })
  const todayRecord = useMemo(() => records.find((record) => record.date === today) ?? null, [records, today])
  const summaryHealthHint = healthExportHint || (todayRecord?.flag_suspicious ? SUSPICIOUS_EXPORT_HINT : '')

  const handleExportToHealth = useCallback(() => {
    if (!todayRecord) return

    try {
      const payload = buildHealthPayload(todayRecord)
      const shortcutUrl = buildShortcutRunUrl(payload, APPLE_HEALTH_SHORTCUT_NAME)

      if (typeof window === 'undefined') {
        throw new Error('window is unavailable')
      }

      window.location.href = shortcutUrl
      setHealthExportHint('')
    } catch {
      setHealthExportHint(HEALTH_EXPORT_ERROR_HINT)
    }
  }, [todayRecord])

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
    if (squatLogged) {
      setSquatSuccess(computeSquatSuccess(nextCount, squatTargetReps))
    }
    goalAlertsRef.current.onSquatProgress(nextCount, squatTargetReps)
  }

  function handleSquatTargetRepsChange(rawValue: string) {
    const nextTarget = sanitizeTargetReps(Number(rawValue))
    setSquatTargetReps(nextTarget)
    if (squatLogged) {
      setSquatSuccess(computeSquatSuccess(squatCount, nextTarget))
    }
    goalAlertsRef.current.onSquatProgress(squatCount, nextTarget)
  }

  function handleSquatComplete() {
    const finalCount = completeSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatCount(finalCount)
    goalAlertsRef.current.onSquatProgress(finalCount, squatTargetReps)
    setSquatSuccess(computeSquatSuccess(finalCount, squatTargetReps))
    setSquatLogged(true)
  }

  function handlePushupDoneRepsChange(rawValue: string) {
    const nextCount = sanitizeDoneReps(Number(rawValue))
    if (pushupCounterRef.current) {
      pushupCounterRef.current.count = nextCount
    }
    setPushupCount(nextCount)
    if (pushupLogged) {
      setPushupSuccess(computeSquatSuccess(nextCount, pushupTargetReps))
    }
    goalAlertsRef.current.onPushupProgress(nextCount, pushupTargetReps)
  }

  function handlePushupTargetRepsChange(rawValue: string) {
    const nextTarget = sanitizeTargetReps(Number(rawValue))
    setPushupTargetReps(nextTarget)
    if (pushupLogged) {
      setPushupSuccess(computeSquatSuccess(pushupCount, nextTarget))
    }
    goalAlertsRef.current.onPushupProgress(pushupCount, nextTarget)
  }

  function handlePushupComplete() {
    const finalCount = completeSquatCounter(pushupCounterRef.current as DomainSquatCounter)
    setPushupCount(finalCount)
    goalAlertsRef.current.onPushupProgress(finalCount, pushupTargetReps)
    setPushupSuccess(computeSquatSuccess(finalCount, pushupTargetReps))
    setPushupLogged(true)
  }

  function handleMainPointerDown(event: ReactPointerEvent<HTMLElement>) {
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      ignore: isSwipeIgnoredTarget(event.target),
    }
  }

  function handleMainPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const swipeStart = swipeStartRef.current
    if (!swipeStart) return
    if (swipeStart.pointerId !== event.pointerId) {
      swipeStartRef.current = null
      return
    }

    swipeStartRef.current = null
    if (swipeStart.ignore) return

    const direction = detectSwipeDirection({
      startX: swipeStart.x,
      startY: swipeStart.y,
      endX: event.clientX,
      endY: event.clientY,
    })
    if (!direction) return

    const nextView = getAdjacentView(NAV_VIEWS, view, direction)
    if (nextView) {
      setView(nextView)
    }
  }

  function handleMainPointerCancel() {
    swipeStartRef.current = null
  }

  function handleMainPointerLeave() {
    swipeStartRef.current = null
  }

  function handleMainLostPointerCapture() {
    swipeStartRef.current = null
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
    if (!plankLogged || !squatLogged || !pushupLogged || savedTodayRef.current) return

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
      pushup: {
        target_reps: pushupTargetReps,
        actual_reps: pushupCount,
        success: pushupSuccess,
      },
      fatigue: 0,
      F_P: 0,
      F_S: 0,
      F_U: 0,
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
      F_U: snapshot.F_U,
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
      pushup: tomorrowPlan.pushup_target_reps,
    })
  }, [plankLogged, squatLogged, pushupLogged, records, today, plankTargetSec, squatTargetReps, pushupTargetReps, plankResult, squatCount, squatSuccess, pushupCount, pushupSuccess])

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
      case 'pushup':
        return (
          <RepsCounter
            title="Pushup Counter"
            idPrefix="pushup"
            exerciseName="pushups"
            count={pushupCount}
            targetReps={pushupTargetReps}
            onDoneRepsChange={handlePushupDoneRepsChange}
            onTargetRepsChange={handlePushupTargetRepsChange}
            onComplete={handlePushupComplete}
          />
        )
      case 'summary':
        return (
          <DailySummary
            plankTargetSec={plankTargetSec}
            squatTargetReps={squatTargetReps}
            pushupTargetReps={pushupTargetReps}
            tomorrowPlankTargetSec={tomorrowTargets.plank}
            tomorrowSquatTargetReps={tomorrowTargets.squat}
            tomorrowPushupTargetReps={tomorrowTargets.pushup}
            plankSuccess={plankResult.success}
            squatSuccess={squatSuccess}
            pushupSuccess={pushupSuccess}
            fatigue={fatigue}
            overloadWarning={overloadWarning}
            suspiciousSession={suspiciousSession}
            onExportToHealth={handleExportToHealth}
            healthExportEnabled={todayRecord !== null}
            healthExportHint={summaryHealthHint}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      <div className="app-shell">
        <header className="app-header" data-swipe-ignore="true">
          <h1 className="app-title">Daily Plank, Squat &amp; Pushup</h1>
          <p className="app-subtitle">Train consistently. Recover intelligently.</p>
        </header>
        <main
          className={`main-content${isWorkoutView(view) ? ' main-content--workout' : ''}`}
          onPointerDown={handleMainPointerDown}
          onPointerUp={handleMainPointerUp}
          onPointerCancel={handleMainPointerCancel}
          onPointerLeave={handleMainPointerLeave}
          onLostPointerCapture={handleMainLostPointerCapture}
        >
          <div className="view-stage">
            {renderView()}
          </div>
        </main>
        <nav className="nav app-tabbar" aria-label="Exercise navigation" data-swipe-ignore="true">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              type="button"
              className={`nav-btn app-tabbar__button${view === item.view ? ' app-tabbar__button--active' : ''}`}
              aria-current={view === item.view ? 'page' : undefined}
              onClick={() => setView(item.view)}
            >
              <TabIcon view={item.view} />
              <span className="app-tabbar__label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
