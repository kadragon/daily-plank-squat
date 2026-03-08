import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import PlankTimer from './components/plank-timer'
import RepsCounter from './components/reps-counter'
import Settings from './components/settings'
import SquatCounter from './components/squat-counter'
import WorkoutOverview from './components/workout-overview'
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
import { getRecommendationReasonText } from './locales/ko'
import { loadSettings, saveSettings, type AppSettings, type ExerciseId } from './storage/settings'
import type { BaseTargets, DailyRecord, FatigueParams, PlankState, RecommendationReason } from './types'
import { addDaysToDateKey, getTodayDateKey } from './utils/date-key'

type AppView = 'plank' | 'squat' | 'pushup' | 'deadhang' | 'dumbbell' | 'overview' | 'settings'
type PersistReason = 'general' | 'squat-complete' | 'pushup-complete' | 'dumbbell-complete'
type CompleteSaveFeedbackTarget = 'squat' | 'pushup' | 'dumbbell'
type SaveFeedbackTone = 'info' | 'success' | 'error'
type TimedWorkoutResult = { actualSec: number, success: boolean }

interface UseTimedWorkoutOptions {
  state: PlankState
  targetSec: number
  timerRef: { current: DomainPlankTimer | null }
  setElapsedMs: (elapsedMs: number) => void
  onProgressSeconds: (elapsedSec: number) => void
  setResult: (result: TimedWorkoutResult) => void
  setLogged: (logged: boolean) => void
  completedElapsedMsRef: { current: number }
  syncState: (now?: number) => void
  onCompleted?: () => void
  requestPersist: () => void
}

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
  deadhangTargetSec: number
  plankActualSec: number
  plankSuccess: boolean
  deadhangActualSec: number
  deadhangSuccess: boolean
  squatActualReps: number
  squatSuccess: boolean
  pushupActualReps: number
  pushupSuccess: boolean
  dumbbellTargetReps: number
  dumbbellActualReps: number
  dumbbellSuccess: boolean
  fatigue: number
  overloadWarning: boolean
  suspiciousSession: boolean
  tomorrowPlankTargetSec: number
  tomorrowSquatTargetReps: number
  tomorrowPushupTargetReps: number
  tomorrowDeadhangTargetSec: number
  tomorrowDumbbellTargetReps: number
  tomorrowPlankReason: RecommendationReason
  tomorrowSquatReason: RecommendationReason
  tomorrowPushupReason: RecommendationReason
  tomorrowDeadhangReason: RecommendationReason
  tomorrowDumbbellReason: RecommendationReason
  plankState: PlankState
  deadhangState: PlankState
  alreadyLoggedPlankToday: boolean
  alreadyLoggedDeadhangToday: boolean
  squatCompleted: boolean
  pushupCompleted: boolean
  dumbbellCompleted: boolean
}

const BASE_TARGETS: BaseTargets = {
  base_P: 60,
  base_S: 20,
  base_U: 15,
  base_D: 30,
  base_DB: 10,
}

const DEFAULT_PARAMS: FatigueParams = {
  age: 30,
  weight_kg: 70,
  gender: 'other',
}

const ALL_NAV_VIEWS: readonly AppView[] = ['plank', 'squat', 'pushup', 'deadhang', 'dumbbell', 'overview', 'settings']

const ALL_NAV_ITEMS: readonly NavItemMeta[] = [
  { view: 'plank', label: 'Plank' },
  { view: 'squat', label: 'Squat' },
  { view: 'pushup', label: 'Pushup' },
  { view: 'deadhang', label: 'Deadhang' },
  { view: 'dumbbell', label: 'Dumbbell' },
  { view: 'overview', label: 'Overview' },
  { view: 'settings', label: 'Settings' },
]

const EXERCISE_VIEW_MAP: Record<ExerciseId, AppView> = {
  plank: 'plank',
  squat: 'squat',
  pushup: 'pushup',
  deadhang: 'deadhang',
  dumbbell: 'dumbbell',
}

function getActiveNavViews(settings: AppSettings): AppView[] {
  return ALL_NAV_VIEWS.filter((v) => {
    if (v === 'overview' || v === 'settings') return true
    const exerciseId = Object.entries(EXERCISE_VIEW_MAP).find(([, view]) => view === v)?.[0] as ExerciseId | undefined
    if (!exerciseId) return true
    return settings.exercises[exerciseId].enabled
  })
}

function getActiveNavItems(settings: AppSettings): NavItemMeta[] {
  const activeViews = getActiveNavViews(settings)
  return ALL_NAV_ITEMS.filter((item) => activeViews.includes(item.view))
}

const APPLE_HEALTH_SHORTCUT_NAME = 'DailyPlankSquatToHealth'
const HEALTH_EXPORT_ERROR_HINT = 'Could not open Shortcuts. Check that Apple Shortcuts is available on this device.'
const SUSPICIOUS_EXPORT_HINT = '기록은 가능하지만 측정 환경 경고'

function isWorkoutView(view: AppView): boolean {
  return view === 'plank' || view === 'squat' || view === 'pushup' || view === 'deadhang' || view === 'dumbbell'
}

function isScrollableView(view: AppView): boolean {
  return view === 'overview' || view === 'settings'
}

function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input,button,label,textarea,select,a,[data-swipe-ignore="true"]') !== null
}

function getCompleteSaveFeedbackTarget(reason: PersistReason): CompleteSaveFeedbackTarget | null {
  if (reason === 'squat-complete') return 'squat'
  if (reason === 'pushup-complete') return 'pushup'
  if (reason === 'dumbbell-complete') return 'dumbbell'
  return null
}

function TabIcon({ view }: { view: AppView }) {
  switch (view) {
    case 'plank':
      return <span className="app-tabbar__icon" aria-hidden="true">🧘</span>
    case 'squat':
      return <span className="app-tabbar__icon" aria-hidden="true">🏋️</span>
    case 'pushup':
      return <span className="app-tabbar__icon" aria-hidden="true">💪</span>
    case 'deadhang':
      return <span className="app-tabbar__icon" aria-hidden="true">🧗</span>
    case 'dumbbell':
      return <span className="app-tabbar__icon" aria-hidden="true">🏋️‍♂️</span>
    case 'overview':
      return <span className="app-tabbar__icon" aria-hidden="true">📊</span>
    case 'settings':
      return <span className="app-tabbar__icon" aria-hidden="true">⚙️</span>
    default:
      return null
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function useTimedWorkout({
  state,
  targetSec,
  timerRef,
  setElapsedMs,
  onProgressSeconds,
  setResult,
  setLogged,
  completedElapsedMsRef,
  syncState,
  onCompleted,
  requestPersist,
}: UseTimedWorkoutOptions): void {
  useEffect(() => {
    if (state !== 'RUNNING') return undefined

    let frameId = 0
    const tick = () => {
      const now = nowMs()
      const currentElapsed = timerRef.current?.getCurrentElapsed(now) ?? 0
      setElapsedMs(currentElapsed)
      onProgressSeconds(Math.floor(currentElapsed / 1000))

      if (currentElapsed >= targetSec * 1000) {
        const result = timerRef.current?.complete(now)
        if (result) {
          completedElapsedMsRef.current = timerRef.current?.getCurrentElapsed(now) ?? currentElapsed
          setResult({ actualSec: result.actual_sec, success: result.success })
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
  }, [
    state,
    targetSec,
    timerRef,
    setElapsedMs,
    onProgressSeconds,
    setResult,
    setLogged,
    completedElapsedMsRef,
    syncState,
    onCompleted,
    requestPersist,
  ])
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

function isDeadhangLogged(record: DailyRecord | null): boolean {
  if (!record) return false
  return record.deadhang.success || record.deadhang.actual_sec > 0
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
      deadhang_target_sec: todayRecord.deadhang.target_sec,
      dumbbell_target_reps: todayRecord.dumbbell.target_reps,
      fatigue: todayRecord.fatigue,
    }
    : computeTomorrowPlan(historyBeforeToday, DEFAULT_PARAMS, BASE_TARGETS, today)

  const tomorrowPlan = computeTomorrowPlan(records, DEFAULT_PARAMS, BASE_TARGETS, addDaysToDateKey(today, 1))
  const plankLoggedToday = isPlankLogged(todayRecord)
  const deadhangLoggedToday = isDeadhangLogged(todayRecord)

  return {
    records,
    plankTargetSec: todayTargets.plank_target_sec,
    squatTargetReps: todayTargets.squat_target_reps,
    pushupTargetReps: todayTargets.pushup_target_reps,
    deadhangTargetSec: todayTargets.deadhang_target_sec,
    dumbbellTargetReps: todayTargets.dumbbell_target_reps,
    plankActualSec: todayRecord?.plank.actual_sec ?? 0,
    plankSuccess: todayRecord?.plank.success ?? false,
    deadhangActualSec: todayRecord?.deadhang.actual_sec ?? 0,
    deadhangSuccess: todayRecord?.deadhang.success ?? false,
    squatActualReps: todayRecord?.squat.actual_reps ?? 0,
    squatSuccess: todayRecord?.squat.success ?? false,
    pushupActualReps: todayRecord?.pushup.actual_reps ?? 0,
    pushupSuccess: todayRecord?.pushup.success ?? false,
    dumbbellActualReps: todayRecord?.dumbbell.actual_reps ?? 0,
    dumbbellSuccess: todayRecord?.dumbbell.success ?? false,
    fatigue: todayRecord?.fatigue ?? todayTargets.fatigue,
    overloadWarning: todayRecord ? tomorrowPlan.overload_warning : false,
    suspiciousSession: todayRecord?.flag_suspicious ?? false,
    tomorrowPlankTargetSec: tomorrowPlan.plank_target_sec,
    tomorrowSquatTargetReps: tomorrowPlan.squat_target_reps,
    tomorrowPushupTargetReps: tomorrowPlan.pushup_target_reps,
    tomorrowDeadhangTargetSec: tomorrowPlan.deadhang_target_sec,
    tomorrowDumbbellTargetReps: tomorrowPlan.dumbbell_target_reps,
    tomorrowPlankReason: tomorrowPlan.plank_reason,
    tomorrowSquatReason: tomorrowPlan.squat_reason,
    tomorrowPushupReason: tomorrowPlan.pushup_reason,
    tomorrowDeadhangReason: tomorrowPlan.deadhang_reason,
    tomorrowDumbbellReason: tomorrowPlan.dumbbell_reason,
    plankState: initialPlankState ?? (plankLoggedToday ? (todayRecord?.plank.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE'),
    deadhangState: deadhangLoggedToday ? (todayRecord?.deadhang.success ? 'COMPLETED' : 'CANCELLED') : 'IDLE',
    alreadyLoggedPlankToday: plankLoggedToday,
    alreadyLoggedDeadhangToday: deadhangLoggedToday,
    squatCompleted: todayRecord?.squat_completed ?? false,
    pushupCompleted: todayRecord?.pushup_completed ?? false,
    dumbbellCompleted: todayRecord?.dumbbell_completed ?? false,
  }
}

export default function App({ initialView = 'plank', initialPlankState, initialWakeLockNotice }: AppProps) {
  const initial = useRef(createInitialAppState(initialPlankState)).current
  const today = useMemo(() => todayKey(), [])

  const plankTimerRef = useRef<DomainPlankTimer | null>(null)
  const deadhangTimerRef = useRef<DomainPlankTimer | null>(null)
  const squatCounterRef = useRef<DomainSquatCounter | null>(null)
  const pushupCounterRef = useRef<DomainSquatCounter | null>(null)
  const dumbbellCounterRef = useRef<DomainSquatCounter | null>(null)
  const plankVisibilityTrackerRef = useRef(createVisibilityTracker())
  const deadhangVisibilityTrackerRef = useRef(createVisibilityTracker())
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null)
  const goalAlertsRef = useRef(createGoalAlerts(() => playGoalFeedback()))
  const lastSavedSnapshotRef = useRef('')
  const completedPlankElapsedMsRef = useRef(initial.plankActualSec * 1000)
  const completedDeadhangElapsedMsRef = useRef(initial.deadhangActualSec * 1000)
  const swipeStartRef = useRef<{ x: number, y: number, pointerId: number, ignore: boolean } | null>(null)

  if (plankTimerRef.current === null) {
    plankTimerRef.current = createPlankTimer()
  }
  if (deadhangTimerRef.current === null) {
    deadhangTimerRef.current = createPlankTimer()
  }
  if (squatCounterRef.current === null) {
    squatCounterRef.current = createSquatCounter()
    squatCounterRef.current.count = initial.squatActualReps
  }
  if (pushupCounterRef.current === null) {
    pushupCounterRef.current = createSquatCounter()
    pushupCounterRef.current.count = initial.pushupActualReps
  }
  if (dumbbellCounterRef.current === null) {
    dumbbellCounterRef.current = createSquatCounter()
    dumbbellCounterRef.current.count = initial.dumbbellActualReps
  }

  const [records, setRecords] = useState<DailyRecord[]>(initial.records)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadSettings())
  const activeNavViews = useMemo(() => getActiveNavViews(appSettings), [appSettings])
  const [view, setView] = useState<AppView>(() => {
    const active = getActiveNavViews(loadSettings())
    return active.includes(initialView) ? initialView : (active[0] ?? 'settings')
  })
  const activeNavItems = useMemo(() => getActiveNavItems(appSettings), [appSettings])
  const [plankState, setPlankState] = useState<PlankState>(initial.plankState)
  const [plankElapsedMs, setPlankElapsedMs] = useState(initial.plankActualSec * 1000)
  const [plankResult, setPlankResult] = useState({ actualSec: initial.plankActualSec, success: initial.plankSuccess })
  const [plankLogged, setPlankLogged] = useState(initial.alreadyLoggedPlankToday)
  const [deadhangState, setDeadhangState] = useState<PlankState>(initial.deadhangState)
  const [deadhangElapsedMs, setDeadhangElapsedMs] = useState(initial.deadhangActualSec * 1000)
  const [deadhangResult, setDeadhangResult] = useState({ actualSec: initial.deadhangActualSec, success: initial.deadhangSuccess })
  const [deadhangLogged, setDeadhangLogged] = useState(initial.alreadyLoggedDeadhangToday)

  const [squatCount, setSquatCount] = useState(initial.squatActualReps)
  const [squatSuccess, setSquatSuccess] = useState(initial.squatSuccess)
  const [squatCompleted, setSquatCompleted] = useState(initial.squatCompleted)

  const [pushupCount, setPushupCount] = useState(initial.pushupActualReps)
  const [pushupSuccess, setPushupSuccess] = useState(initial.pushupSuccess)
  const [pushupCompleted, setPushupCompleted] = useState(initial.pushupCompleted)

  const [dumbbellCount, setDumbbellCount] = useState(initial.dumbbellActualReps)
  const [dumbbellSuccess, setDumbbellSuccess] = useState(initial.dumbbellSuccess)
  const [dumbbellCompleted, setDumbbellCompleted] = useState(initial.dumbbellCompleted)

  const [plankTargetSec, setPlankTargetSec] = useState(initial.plankTargetSec)
  const [deadhangTargetSec, setDeadhangTargetSec] = useState(initial.deadhangTargetSec)
  const [squatTargetReps, setSquatTargetReps] = useState(initial.squatTargetReps)
  const [pushupTargetReps, setPushupTargetReps] = useState(initial.pushupTargetReps)
  const [dumbbellTargetReps, setDumbbellTargetReps] = useState(initial.dumbbellTargetReps)
  const [fatigue, setFatigue] = useState(initial.fatigue)
  const [overloadWarning, setOverloadWarning] = useState(initial.overloadWarning)
  const [suspiciousSession, setSuspiciousSession] = useState(initial.suspiciousSession)
  const [wakeLockNotice, setWakeLockNotice] = useState(initialWakeLockNotice ?? '')
  const [healthExportHint, setHealthExportHint] = useState('')
  const [tomorrowTargets, setTomorrowTargets] = useState({
    plank: initial.tomorrowPlankTargetSec,
    squat: initial.tomorrowSquatTargetReps,
    pushup: initial.tomorrowPushupTargetReps,
    deadhang: initial.tomorrowDeadhangTargetSec,
    dumbbell: initial.tomorrowDumbbellTargetReps,
    plankReason: initial.tomorrowPlankReason,
    squatReason: initial.tomorrowSquatReason,
    pushupReason: initial.tomorrowPushupReason,
    deadhangReason: initial.tomorrowDeadhangReason,
    dumbbellReason: initial.tomorrowDumbbellReason,
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
    setPlankElapsedMs(plankTimerRef.current?.getCurrentElapsed(now) ?? 0)
  }, [])

  const syncDeadhangState = useCallback((now = nowMs()) => {
    setDeadhangState(deadhangTimerRef.current?.state() ?? 'IDLE')
    setDeadhangElapsedMs(deadhangTimerRef.current?.getCurrentElapsed(now) ?? 0)
  }, [])

  function handlePlankStart() {
    if (deadhangState === 'RUNNING') return
    plankVisibilityTrackerRef.current = createVisibilityTracker()
    plankTimerRef.current?.start(nowMs())
    setPlankResult({ actualSec: 0, success: false })
    setPlankLogged(false)
    setSuspiciousSession(false)
    completedPlankElapsedMsRef.current = 0
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
      completedPlankElapsedMsRef.current = elapsed
      setPlankResult({ actualSec: result.actual_sec, success: false })
      setPlankLogged(true)
      requestPersist()
    }
    syncPlankState()
  }

  function handleDeadhangStart() {
    if (plankState === 'RUNNING') return
    deadhangVisibilityTrackerRef.current = createVisibilityTracker()
    deadhangTimerRef.current?.start(nowMs())
    setDeadhangResult({ actualSec: 0, success: false })
    setDeadhangLogged(false)
    setSuspiciousSession(false)
    completedDeadhangElapsedMsRef.current = 0
    syncDeadhangState()
  }

  function handleDeadhangPause() {
    deadhangTimerRef.current?.pause(nowMs())
    syncDeadhangState()
  }

  function handleDeadhangResume() {
    deadhangTimerRef.current?.resume(nowMs())
    syncDeadhangState()
  }

  function handleDeadhangCancel() {
    const now = nowMs()
    const result = deadhangTimerRef.current?.cancel(now)
    if (result) {
      const elapsed = deadhangTimerRef.current?.getCurrentElapsed(now) ?? 0
      completedDeadhangElapsedMsRef.current = elapsed
      setDeadhangResult({ actualSec: result.actual_sec, success: false })
      setDeadhangLogged(true)
      requestPersist()
    }
    syncDeadhangState()
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
    if (squatCount === 0 && squatCounterRef.current) {
      squatCounterRef.current.count = squatTargetReps
    }
    const finalCount = completeSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatCount(finalCount)
    goalAlertsRef.current.onSquatProgress(finalCount, squatTargetReps)
    setSquatSuccess(computeSquatSuccess(finalCount, squatTargetReps))
    setSquatCompleted(true)
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
    if (pushupCount === 0 && pushupCounterRef.current) {
      pushupCounterRef.current.count = pushupTargetReps
    }
    const finalCount = completeSquatCounter(pushupCounterRef.current as DomainSquatCounter)
    setPushupCount(finalCount)
    goalAlertsRef.current.onPushupProgress(finalCount, pushupTargetReps)
    setPushupSuccess(computeSquatSuccess(finalCount, pushupTargetReps))
    setPushupCompleted(true)
    clearCompleteSaveFeedbackTimer()
    setCompleteSaveFeedback({ target: 'pushup', text: 'Saving...', tone: 'info' })
    requestPersist('pushup-complete')
  }

  function handleDumbbellDoneRepsChange(rawValue: string) {
    const nextCount = sanitizeDoneReps(Number(rawValue))
    if (dumbbellCounterRef.current) {
      dumbbellCounterRef.current.count = nextCount
    }
    setDumbbellCount(nextCount)
    setDumbbellSuccess(computeSquatSuccess(nextCount, dumbbellTargetReps))
    goalAlertsRef.current.onDumbbellProgress(nextCount, dumbbellTargetReps)
    requestPersist()
  }

  function handleDumbbellTargetRepsChange(rawValue: string) {
    const nextTarget = sanitizeTargetReps(Number(rawValue))
    setDumbbellTargetReps(nextTarget)
    setDumbbellSuccess(computeSquatSuccess(dumbbellCount, nextTarget))
    goalAlertsRef.current.onDumbbellProgress(dumbbellCount, nextTarget)
    requestPersist()
  }

  function handleDumbbellComplete() {
    if (!dumbbellCounterRef.current) return
    if (dumbbellCount === 0) {
      dumbbellCounterRef.current.count = dumbbellTargetReps
    }
    const finalCount = completeSquatCounter(dumbbellCounterRef.current)
    setDumbbellCount(finalCount)
    goalAlertsRef.current.onDumbbellProgress(finalCount, dumbbellTargetReps)
    setDumbbellSuccess(computeSquatSuccess(finalCount, dumbbellTargetReps))
    setDumbbellCompleted(true)
    clearCompleteSaveFeedbackTimer()
    setCompleteSaveFeedback({ target: 'dumbbell', text: 'Saving...', tone: 'info' })
    requestPersist('dumbbell-complete')
  }

  function handleToggleExercise(id: ExerciseId, enabled: boolean) {
    const next: AppSettings = {
      ...appSettings,
      exercises: {
        ...appSettings.exercises,
        [id]: { enabled },
      },
    }
    setAppSettings(next)
    saveSettings(next)
    // If current view is being disabled, navigate to first enabled view
    const nextActiveViews = getActiveNavViews(next)
    if (!nextActiveViews.includes(view)) {
      setView(nextActiveViews[0] ?? 'settings')
    }
  }

  function handleSettingsTargetChange(id: ExerciseId, value: number) {
    switch (id) {
      case 'plank':
        setPlankTargetSec(value)
        requestPersist()
        break
      case 'squat':
        setSquatTargetReps(value)
        requestPersist()
        break
      case 'pushup':
        setPushupTargetReps(value)
        requestPersist()
        break
      case 'deadhang':
        setDeadhangTargetSec(value)
        requestPersist()
        break
      case 'dumbbell':
        setDumbbellTargetReps(value)
        requestPersist()
        break
    }
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

    const nextView = getAdjacentView(activeNavViews, view, direction)
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

  const onPlankProgressSeconds = useCallback((elapsedSec: number) => {
    goalAlertsRef.current.onPlankProgress(elapsedSec, plankTargetSec)
  }, [plankTargetSec])

  const onDeadhangProgressSeconds = useCallback((elapsedSec: number) => {
    goalAlertsRef.current.onDeadhangProgress(elapsedSec, deadhangTargetSec)
  }, [deadhangTargetSec])

  useTimedWorkout({
    state: plankState,
    targetSec: plankTargetSec,
    timerRef: plankTimerRef,
    setElapsedMs: setPlankElapsedMs,
    onProgressSeconds: onPlankProgressSeconds,
    setResult: setPlankResult,
    setLogged: setPlankLogged,
    completedElapsedMsRef: completedPlankElapsedMsRef,
    syncState: syncPlankState,
    requestPersist,
  })

  useTimedWorkout({
    state: deadhangState,
    targetSec: deadhangTargetSec,
    timerRef: deadhangTimerRef,
    setElapsedMs: setDeadhangElapsedMs,
    onProgressSeconds: onDeadhangProgressSeconds,
    setResult: setDeadhangResult,
    setLogged: setDeadhangLogged,
    completedElapsedMsRef: completedDeadhangElapsedMsRef,
    syncState: syncDeadhangState,
    requestPersist,
  })

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const onChange = () => {
      const now = nowMs()
      onVisibilityChange({
        tracker: plankVisibilityTrackerRef.current,
        isHidden: document.hidden,
        timerState: plankState,
        now,
      })
      onVisibilityChange({
        tracker: deadhangVisibilityTrackerRef.current,
        isHidden: document.hidden,
        timerState: deadhangState,
        now,
      })

      if (!document.hidden) {
        setPlankElapsedMs(plankTimerRef.current?.getCurrentElapsed(now) ?? 0)
        setDeadhangElapsedMs(deadhangTimerRef.current?.getCurrentElapsed(now) ?? 0)
      }
    }

    document.addEventListener('visibilitychange', onChange)
    return () => {
      document.removeEventListener('visibilitychange', onChange)
    }
  }, [plankState, deadhangState])

  useEffect(() => {
    let isDisposed = false
    const wakeLock = getWakeLock()
    const hasRunningTimer = plankState === 'RUNNING' || deadhangState === 'RUNNING'
    const wakeLockState: PlankState = hasRunningTimer ? 'RUNNING' : 'COMPLETED'

    async function sync() {
      try {
        const next = await syncWakeLock(wakeLockState, wakeLockSentinelRef.current, wakeLock)
        if (!isDisposed) {
          wakeLockSentinelRef.current = next
          if (hasRunningTimer && !wakeLock) {
            setWakeLockNotice('Wake Lock is not supported on this device. Keep the screen on manually.')
          } else {
            setWakeLockNotice('')
          }
        }
      } catch {
        if (!isDisposed && hasRunningTimer) {
          setWakeLockNotice('Wake Lock could not be acquired. Keep the screen on manually.')
        }
      }
    }

    void sync()
    return () => {
      isDisposed = true
    }
  }, [plankState, deadhangState])

  useEffect(() => {
    if (persistRequest.id === 0) return
    const feedbackTarget = getCompleteSaveFeedbackTarget(persistRequest.reason)
    const scheduleCompleteSaveFeedbackSuccess = (target: CompleteSaveFeedbackTarget) => {
      clearCompleteSaveFeedbackTimer()
      completeSaveFeedbackTimerRef.current = setTimeout(() => {
        setCompleteSaveFeedback({ target, text: 'Saved just now', tone: 'success' })
        completeSaveFeedbackTimerRef.current = setTimeout(() => {
          setCompleteSaveFeedback((current) => (current?.target === target ? null : current))
          completeSaveFeedbackTimerRef.current = null
        }, 2500)
      }, 120)
    }

    const plankSessionElapsedMs = plankLogged ? (completedPlankElapsedMsRef.current || plankResult.actualSec * 1000) : 0
    const deadhangSessionElapsedMs = deadhangLogged
      ? (completedDeadhangElapsedMsRef.current || deadhangResult.actualSec * 1000)
      : 0
    const plankInactiveTimeRatio = plankLogged
      ? getInactiveTimeRatio(plankVisibilityTrackerRef.current, plankSessionElapsedMs, nowMs())
      : 0
    const deadhangInactiveTimeRatio = deadhangLogged
      ? getInactiveTimeRatio(deadhangVisibilityTrackerRef.current, deadhangSessionElapsedMs, nowMs())
      : 0
    const inactiveTimeRatio = Math.max(plankInactiveTimeRatio, deadhangInactiveTimeRatio)
    const flagSuspicious = (plankLogged || deadhangLogged) ? inactiveTimeRatio > 0.5 : false

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
      deadhang: {
        target_sec: deadhangTargetSec,
        actual_sec: deadhangResult.actualSec,
        success: deadhangResult.success,
      },
      dumbbell: {
        target_reps: dumbbellTargetReps,
        actual_reps: dumbbellCount,
        success: dumbbellSuccess,
      },
      fatigue: 0,
      F_P: 0,
      F_S: 0,
      F_U: 0,
      F_D: 0,
      F_DB: 0,
      F_total_raw: 0,
      inactive_time_ratio: inactiveTimeRatio,
      flag_suspicious: flagSuspicious,
      squat_completed: squatCompleted,
      pushup_completed: pushupCompleted,
      dumbbell_completed: dumbbellCompleted,
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
      F_D: snapshot.F_D,
      F_DB: snapshot.F_DB,
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
    const tomorrowPlan = computeTomorrowPlan(nextRecords, DEFAULT_PARAMS, BASE_TARGETS, addDaysToDateKey(today, 1))

    setRecords(nextRecords)
    setFatigue(finalRecord.fatigue)
    setOverloadWarning(tomorrowPlan.overload_warning)
    setSuspiciousSession(flagSuspicious)
    setTomorrowTargets({
      plank: tomorrowPlan.plank_target_sec,
      squat: tomorrowPlan.squat_target_reps,
      pushup: tomorrowPlan.pushup_target_reps,
      deadhang: tomorrowPlan.deadhang_target_sec,
      dumbbell: tomorrowPlan.dumbbell_target_reps,
      plankReason: tomorrowPlan.plank_reason,
      squatReason: tomorrowPlan.squat_reason,
      pushupReason: tomorrowPlan.pushup_reason,
      deadhangReason: tomorrowPlan.deadhang_reason,
      dumbbellReason: tomorrowPlan.dumbbell_reason,
    })
    if (feedbackTarget) {
      scheduleCompleteSaveFeedbackSuccess(feedbackTarget)
    }
  }, [
    persistRequest,
    plankLogged,
    deadhangLogged,
    records,
    today,
    plankTargetSec,
    deadhangTargetSec,
    squatTargetReps,
    pushupTargetReps,
    plankResult,
    deadhangResult,
    squatCount,
    squatSuccess,
    pushupCount,
    pushupSuccess,
    dumbbellTargetReps,
    dumbbellCount,
    dumbbellSuccess,
    squatCompleted,
    pushupCompleted,
    dumbbellCompleted,
    clearCompleteSaveFeedbackTimer,
  ])

  useEffect(() => () => {
    clearCompleteSaveFeedbackTimer()
  }, [clearCompleteSaveFeedbackTimer])

  function renderView() {
    switch (view) {
      case 'plank':
        return (
          <>
            <PlankTimer
              elapsedMs={plankElapsedMs}
              targetSec={plankTargetSec}
              state={plankState}
              tomorrowTargetSec={tomorrowTargets.plank}
              tomorrowDeltaSec={tomorrowTargets.plank - plankTargetSec}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.plankReason, 'plank')}
              startDisabled={deadhangState === 'RUNNING'}
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
              showRecommendation={squatCompleted}
              tomorrowTargetReps={tomorrowTargets.squat}
              tomorrowDeltaReps={tomorrowTargets.squat - squatTargetReps}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.squatReason, 'squat')}
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
              showRecommendation={pushupCompleted}
              tomorrowTargetReps={tomorrowTargets.pushup}
              tomorrowDeltaReps={tomorrowTargets.pushup - pushupTargetReps}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.pushupReason, 'pushup')}
              saveFeedbackText={pushupSaveFeedback?.text}
              saveFeedbackTone={pushupSaveFeedback?.tone}
              onDoneRepsChange={handlePushupDoneRepsChange}
              onTargetRepsChange={handlePushupTargetRepsChange}
              onComplete={handlePushupComplete}
            />
          )
        }
      case 'deadhang':
        return (
          <>
            <PlankTimer
              title="Deadhang Timer"
              elapsedMs={deadhangElapsedMs}
              targetSec={deadhangTargetSec}
              state={deadhangState}
              tomorrowTargetSec={tomorrowTargets.deadhang}
              tomorrowDeltaSec={tomorrowTargets.deadhang - deadhangTargetSec}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.deadhangReason, 'deadhang')}
              startDisabled={plankState === 'RUNNING'}
              onStart={handleDeadhangStart}
              onPause={handleDeadhangPause}
              onResume={handleDeadhangResume}
              onCancel={handleDeadhangCancel}
            />
            {wakeLockNotice ? <div className="wake-lock-notice">{wakeLockNotice}</div> : null}
          </>
        )
      case 'dumbbell':
        {
          const dumbbellSaveFeedback = completeSaveFeedback?.target === 'dumbbell' ? completeSaveFeedback : null
          return (
            <RepsCounter
              title="Dumbbell Counter"
              idPrefix="dumbbell"
              exerciseName="dumbbell curls"
              count={dumbbellCount}
              targetReps={dumbbellTargetReps}
              showRecommendation={dumbbellCompleted}
              tomorrowTargetReps={tomorrowTargets.dumbbell}
              tomorrowDeltaReps={tomorrowTargets.dumbbell - dumbbellTargetReps}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.dumbbellReason, 'dumbbell')}
              saveFeedbackText={dumbbellSaveFeedback?.text}
              saveFeedbackTone={dumbbellSaveFeedback?.tone}
              onDoneRepsChange={handleDumbbellDoneRepsChange}
              onTargetRepsChange={handleDumbbellTargetRepsChange}
              onComplete={handleDumbbellComplete}
            />
          )
        }
      case 'overview':
        return (
          <WorkoutOverview
            plankTargetSec={plankTargetSec}
            squatTargetReps={squatTargetReps}
            pushupTargetReps={pushupTargetReps}
            deadhangTargetSec={deadhangTargetSec}
            dumbbellTargetReps={dumbbellTargetReps}
            tomorrowPlankTargetSec={tomorrowTargets.plank}
            tomorrowSquatTargetReps={tomorrowTargets.squat}
            tomorrowPushupTargetReps={tomorrowTargets.pushup}
            tomorrowDeadhangTargetSec={tomorrowTargets.deadhang}
            tomorrowDumbbellTargetReps={tomorrowTargets.dumbbell}
            plankSuccess={plankResult.success}
            squatSuccess={squatSuccess}
            pushupSuccess={pushupSuccess}
            deadhangSuccess={deadhangResult.success}
            dumbbellSuccess={dumbbellSuccess}
            fatigue={fatigue}
            overloadWarning={overloadWarning}
            suspiciousSession={suspiciousSession}
            onExportToHealth={handleExportToHealth}
            healthExportEnabled={todayRecord !== null}
            healthExportHint={summaryHealthHint}
            records={records}
          />
        )
      case 'settings':
        return (
          <Settings
            settings={appSettings}
            exerciseTargets={[
              { id: 'plank', label: 'Plank', currentTarget: plankTargetSec, unit: 's' },
              { id: 'squat', label: 'Squat', currentTarget: squatTargetReps, unit: 'reps' },
              { id: 'pushup', label: 'Pushup', currentTarget: pushupTargetReps, unit: 'reps' },
              { id: 'deadhang', label: 'Deadhang', currentTarget: deadhangTargetSec, unit: 's' },
              { id: 'dumbbell', label: 'Dumbbell', currentTarget: dumbbellTargetReps, unit: 'reps' },
            ]}
            onToggleExercise={handleToggleExercise}
            onChangeTarget={handleSettingsTargetChange}
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
          <h1 className="app-title">Daily Plank, Squat, Pushup &amp; Deadhang</h1>
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
          {activeNavItems.map((item) => (
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
