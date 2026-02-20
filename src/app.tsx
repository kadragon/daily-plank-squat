import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import DailySummary from './components/daily-summary'
import PlankTimer from './components/plank-timer'
import RepsCounter from './components/reps-counter'
import SquatCounter from './components/squat-counter'
import WorkoutStats from './components/workout-stats'
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
import { getTodayDateKey } from './utils/date-key'

type AppView = 'plank' | 'squat' | 'pushup' | 'summary' | 'stats'
type PersistReason = 'general' | 'squat-complete' | 'pushup-complete'
type CompleteSaveFeedbackTarget = 'squat' | 'pushup'
type SaveFeedbackTone = 'info' | 'success' | 'error'

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
  alreadyLoggedPlankToday: boolean
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

const NAV_VIEWS = ['plank', 'squat', 'pushup', 'summary', 'stats'] as const satisfies readonly AppView[]

const NAV_ITEMS: readonly NavItemMeta[] = [
  { view: 'plank', label: 'Plank' },
  { view: 'squat', label: 'Squat' },
  { view: 'pushup', label: 'Pushup' },
  { view: 'summary', label: 'Summary' },
  { view: 'stats', label: 'Stats' },
]

const APPLE_HEALTH_SHORTCUT_NAME = 'DailyPlankSquatToHealth'
const HEALTH_EXPORT_ERROR_HINT = 'Could not open Shortcuts. Check that Apple Shortcuts is available on this device.'
const SUSPICIOUS_EXPORT_HINT = '기록은 가능하지만 측정 환경 경고'

function isWorkoutView(view: AppView): boolean {
  return view === 'plank' || view === 'squat' || view === 'pushup'
}

function isScrollableView(view: AppView): boolean {
  return view === 'summary' || view === 'stats'
}

function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input,button,label,textarea,select,a,[data-swipe-ignore="true"]') !== null
}

function getCompleteSaveFeedbackTarget(reason: PersistReason): CompleteSaveFeedbackTarget | null {
  if (reason === 'squat-complete') return 'squat'
  if (reason === 'pushup-complete') return 'pushup'
  return null
}

function TabIcon({ view }: { view: AppView }) {
  switch (view) {
    case 'plank':
      return (
        <svg
          className="app-tabbar__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9.2" cy="7.4" r="1.7" />
          <path d="M5 16.5H10L12.8 10.8H17.6L20 16.5" />
          <path d="M2.5 18.5H21.5" />
        </svg>
      )
    case 'squat':
      return (
        <svg
          className="app-tabbar__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5.5" r="1.7" />
          <path d="M8 10.8H16" />
          <path d="M8.5 10.8L6.5 14.5L8.5 18.5" />
          <path d="M15.5 10.8L17.5 14.5L15.5 18.5" />
          <path d="M9 14.5H15" />
        </svg>
      )
    case 'pushup':
      return (
        <svg
          className="app-tabbar__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8.4" cy="9.2" r="1.6" />
          <path d="M4 14.2H20" />
          <path d="M10 10L13.8 10.6L16.4 14.2" />
          <path d="M6.5 14.2V17.8" />
          <path d="M17.5 14.2V17.8" />
        </svg>
      )
    case 'summary':
      return (
        <svg
          className="app-tabbar__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="4.5" width="14" height="15" rx="2.4" />
          <path d="M8 9H16" />
          <path d="M8 12.5H16" />
          <path d="M8 16H13.5" />
        </svg>
      )
    case 'stats':
      return (
        <svg
          className="app-tabbar__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 18.5H20.5" />
          <path d="M7.2 16.2L11 12.2L14.2 13.8L18.5 8.4" />
          <path d="M18.5 8.4H15.8" />
          <path d="M18.5 8.4V11.2" />
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
  return getTodayDateKey()
}

export function computeSquatSuccess(actualReps: number, targetReps: number): boolean {
  return actualReps >= targetReps
}

function isPlankLogged(record: DailyRecord | null): boolean {
  if (!record) return false
  return record.plank.success || record.plank.actual_sec > 0
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
  const plankLoggedToday = isPlankLogged(todayRecord)

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
    plankState: initialPlankState ?? (plankLoggedToday ? (todayRecord?.plank.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE'),
    alreadyLoggedPlankToday: plankLoggedToday,
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
  const lastSavedSnapshotRef = useRef('')
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
  const [plankLogged, setPlankLogged] = useState(initial.alreadyLoggedPlankToday)

  const [squatCount, setSquatCount] = useState(initial.squatActualReps)
  const [squatSuccess, setSquatSuccess] = useState(initial.squatSuccess)

  const [pushupCount, setPushupCount] = useState(initial.pushupActualReps)
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

  const [persistRequest, setPersistRequest] = useState<{ id: number, reason: PersistReason }>({ id: 0, reason: 'general' })
  const [completeSaveFeedback, setCompleteSaveFeedback] = useState<{
    target: CompleteSaveFeedbackTarget
    text: string
    tone: SaveFeedbackTone
  } | null>(null)
  const completeSaveFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCompleteSaveFeedbackTimer = useCallback(() => {
    if (completeSaveFeedbackTimerRef.current !== null) {
      clearTimeout(completeSaveFeedbackTimerRef.current)
      completeSaveFeedbackTimerRef.current = null
    }
  }, [])

  const scheduleCompleteSaveFeedbackSuccess = useCallback((target: CompleteSaveFeedbackTarget) => {
    clearCompleteSaveFeedbackTimer()
    completeSaveFeedbackTimerRef.current = setTimeout(() => {
      setCompleteSaveFeedback({ target, text: 'Saved just now', tone: 'success' })
      completeSaveFeedbackTimerRef.current = setTimeout(() => {
        setCompleteSaveFeedback((current) => (current?.target === target ? null : current))
        completeSaveFeedbackTimerRef.current = null
      }, 2500)
    }, 120)
  }, [clearCompleteSaveFeedbackTimer])

  const requestPersist = useCallback((reason: PersistReason = 'general') => {
    setPersistRequest((current) => ({ id: current.id + 1, reason }))
  }, [])

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
      requestPersist()
    }
    syncPlankState()
  }

  function handleSquatDoneRepsChange(rawValue: string) {
    const nextCount = sanitizeDoneReps(Number(rawValue))
    if (squatCounterRef.current) {
      squatCounterRef.current.count = nextCount
    }
    setSquatCount(nextCount)
    setSquatSuccess(computeSquatSuccess(nextCount, squatTargetReps))
    goalAlertsRef.current.onSquatProgress(nextCount, squatTargetReps)
    requestPersist()
  }

  function handleSquatTargetRepsChange(rawValue: string) {
    const nextTarget = sanitizeTargetReps(Number(rawValue))
    setSquatTargetReps(nextTarget)
    setSquatSuccess(computeSquatSuccess(squatCount, nextTarget))
    goalAlertsRef.current.onSquatProgress(squatCount, nextTarget)
    requestPersist()
  }

  function handleSquatComplete() {
    const finalCount = completeSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatCount(finalCount)
    goalAlertsRef.current.onSquatProgress(finalCount, squatTargetReps)
    setSquatSuccess(computeSquatSuccess(finalCount, squatTargetReps))
    clearCompleteSaveFeedbackTimer()
    setCompleteSaveFeedback({ target: 'squat', text: 'Saving...', tone: 'info' })
    requestPersist('squat-complete')
  }

  function handlePushupDoneRepsChange(rawValue: string) {
    const nextCount = sanitizeDoneReps(Number(rawValue))
    if (pushupCounterRef.current) {
      pushupCounterRef.current.count = nextCount
    }
    setPushupCount(nextCount)
    setPushupSuccess(computeSquatSuccess(nextCount, pushupTargetReps))
    goalAlertsRef.current.onPushupProgress(nextCount, pushupTargetReps)
    requestPersist()
  }

  function handlePushupTargetRepsChange(rawValue: string) {
    const nextTarget = sanitizeTargetReps(Number(rawValue))
    setPushupTargetReps(nextTarget)
    setPushupSuccess(computeSquatSuccess(pushupCount, nextTarget))
    goalAlertsRef.current.onPushupProgress(pushupCount, nextTarget)
    requestPersist()
  }

  function handlePushupComplete() {
    const finalCount = completeSquatCounter(pushupCounterRef.current as DomainSquatCounter)
    setPushupCount(finalCount)
    goalAlertsRef.current.onPushupProgress(finalCount, pushupTargetReps)
    setPushupSuccess(computeSquatSuccess(finalCount, pushupTargetReps))
    clearCompleteSaveFeedbackTimer()
    setCompleteSaveFeedback({ target: 'pushup', text: 'Saving...', tone: 'info' })
    requestPersist('pushup-complete')
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
          requestPersist()
        }
        syncPlankState(now)
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [plankState, plankTargetSec, syncPlankState, requestPersist])

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
    if (persistRequest.id === 0) return
    const feedbackTarget = getCompleteSaveFeedbackTarget(persistRequest.reason)

    const sessionElapsedMs = plankLogged ? (completedElapsedMsRef.current || plankResult.actualSec * 1000) : 0
    const inactiveTimeRatio = plankLogged
      ? getInactiveTimeRatio(visibilityTrackerRef.current, sessionElapsedMs, nowMs())
      : 0
    const flagSuspicious = plankLogged ? inactiveTimeRatio > 0.5 : false

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

    const snapshotKey = JSON.stringify(finalRecord)
    if (snapshotKey === lastSavedSnapshotRef.current) {
      if (feedbackTarget) {
        scheduleCompleteSaveFeedbackSuccess(feedbackTarget)
      }
      return
    }

    try {
      saveRecord(finalRecord)
    } catch {
      if (feedbackTarget) {
        clearCompleteSaveFeedbackTimer()
        setCompleteSaveFeedback({ target: feedbackTarget, text: 'Save failed. Try again.', tone: 'error' })
      }
      return
    }
    lastSavedSnapshotRef.current = snapshotKey

    const nextRecords = [...withoutToday, finalRecord].toSorted((a, b) => a.date.localeCompare(b.date))
    const tomorrowPlan = computeTomorrowPlan(nextRecords, DEFAULT_PARAMS, BASE_TARGETS)

    setRecords(nextRecords)
    setFatigue(finalRecord.fatigue)
    setOverloadWarning(tomorrowPlan.overload_warning)
    setSuspiciousSession(flagSuspicious)
    setTomorrowTargets({
      plank: tomorrowPlan.plank_target_sec,
      squat: tomorrowPlan.squat_target_reps,
      pushup: tomorrowPlan.pushup_target_reps,
    })
    if (feedbackTarget) {
      scheduleCompleteSaveFeedbackSuccess(feedbackTarget)
    }
  }, [persistRequest, plankLogged, records, today, plankTargetSec, squatTargetReps, pushupTargetReps, plankResult, squatCount, squatSuccess, pushupCount, pushupSuccess, clearCompleteSaveFeedbackTimer, scheduleCompleteSaveFeedbackSuccess])

  useEffect(() => () => {
    clearCompleteSaveFeedbackTimer()
  }, [clearCompleteSaveFeedbackTimer])

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
        {
          const squatSaveFeedback = completeSaveFeedback?.target === 'squat' ? completeSaveFeedback : null
          return (
            <SquatCounter
              count={squatCount}
              targetReps={squatTargetReps}
              saveFeedbackText={squatSaveFeedback?.text}
              saveFeedbackTone={squatSaveFeedback?.tone}
              onDoneRepsChange={handleSquatDoneRepsChange}
              onTargetRepsChange={handleSquatTargetRepsChange}
              onComplete={handleSquatComplete}
            />
          )
        }
      case 'pushup':
        {
          const pushupSaveFeedback = completeSaveFeedback?.target === 'pushup' ? completeSaveFeedback : null
          return (
            <RepsCounter
              title="Pushup Counter"
              idPrefix="pushup"
              exerciseName="pushups"
              count={pushupCount}
              targetReps={pushupTargetReps}
              saveFeedbackText={pushupSaveFeedback?.text}
              saveFeedbackTone={pushupSaveFeedback?.tone}
              onDoneRepsChange={handlePushupDoneRepsChange}
              onTargetRepsChange={handlePushupTargetRepsChange}
              onComplete={handlePushupComplete}
            />
          )
        }
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
      case 'stats':
        return <WorkoutStats records={records} />
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
          className={`main-content${isWorkoutView(view) ? ' main-content--workout main-content--swipe' : ''}`}
          onPointerDown={handleMainPointerDown}
          onPointerUp={handleMainPointerUp}
          onPointerCancel={handleMainPointerCancel}
          onPointerLeave={handleMainPointerLeave}
          onLostPointerCapture={handleMainLostPointerCapture}
        >
          <div className={`view-stage${isScrollableView(view) ? ' view-stage--scrollable' : ''}`}>
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
