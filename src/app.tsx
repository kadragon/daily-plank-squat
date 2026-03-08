import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PlankTimer from './components/plank-timer'
import RepsCounter from './components/reps-counter'
import Settings from './components/settings'
import SquatCounter from './components/squat-counter'
import WorkoutOverview from './components/workout-overview'
import { useRepsExercise } from './hooks/use-reps-exercise'
import { useSwipeNavigation } from './hooks/use-swipe-navigation'
import { useTimedExercise } from './hooks/use-timed-exercise'
import { useWorkoutVisibility } from './hooks/use-workout-visibility'
import { useWorkoutWakeLock } from './hooks/use-workout-wake-lock'
import {
  computeLatestFatigueSnapshot,
  computeTomorrowPlan,
} from './models/fatigue'
import { createGoalAlerts, playGoalFeedback } from './models/goal-alerts'
import {
  type AppView,
  getActiveNavViews,
  getActiveNavItems,
  isWorkoutView,
  isScrollableView,
} from './models/navigation'
import { TabIcon } from './components/tab-icon'
import { saveRecord } from './storage/daily-record'
import { buildHealthPayload, buildShortcutRunUrl } from './integrations/apple-health-shortcut'
import { getRecommendationReasonText } from './locales/ko'
import { loadSettings, saveSettings, type AppSettings, type ExerciseId } from './storage/settings'
import {
  createInitialAppState,
  computeSquatSuccess,
  todayKey,
  BASE_TARGETS,
  DEFAULT_PARAMS,
} from './state/initial-state'
import {
  buildDailyRecord,
  getCompleteSaveFeedbackTarget,
  type PersistReason,
  type CompleteSaveFeedbackTarget,
  type SaveFeedbackTone,
} from './state/build-daily-record'
import type { DailyRecord, PlankState } from './types'
import { addDaysToDateKey } from './utils/date-key'
import { nowMs } from './utils/now-ms'

export { computeSquatSuccess }

interface AppProps {
  initialView?: AppView
  initialPlankState?: PlankState
  initialWakeLockNotice?: string
}

const APPLE_HEALTH_SHORTCUT_NAME = 'DailyPlankSquatToHealth'
const HEALTH_EXPORT_ERROR_HINT = 'Could not open Shortcuts. Check that Apple Shortcuts is available on this device.'
const SUSPICIOUS_EXPORT_HINT = '기록은 가능하지만 측정 환경 경고'

export default function App({ initialView = 'plank', initialPlankState, initialWakeLockNotice }: AppProps) {
  const initial = useRef(createInitialAppState(initialPlankState)).current
  const today = useMemo(() => todayKey(), [])

  const goalAlertsRef = useRef(createGoalAlerts(() => playGoalFeedback()))
  const lastSavedSnapshotRef = useRef('')

  const [records, setRecords] = useState<DailyRecord[]>(initial.records)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadSettings())
  const activeNavViews = useMemo(() => getActiveNavViews(appSettings), [appSettings])
  const [view, setView] = useState<AppView>(() => {
    const active = getActiveNavViews(loadSettings())
    return active.includes(initialView) ? initialView : (active[0] ?? 'settings')
  })
  const activeNavItems = useMemo(() => getActiveNavItems(appSettings), [appSettings])

  const [plankTargetSec, setPlankTargetSec] = useState(initial.plankTargetSec)
  const [deadhangTargetSec, setDeadhangTargetSec] = useState(initial.deadhangTargetSec)
  const [fatigue, setFatigue] = useState(initial.fatigue)
  const [overloadWarning, setOverloadWarning] = useState(initial.overloadWarning)
  const [suspiciousSession, setSuspiciousSession] = useState(initial.suspiciousSession)
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

  // Timed exercise goal alert callbacks
  const onPlankProgressSeconds = useCallback((elapsedSec: number) => {
    goalAlertsRef.current.onPlankProgress(elapsedSec, plankTargetSec)
  }, [plankTargetSec])

  const onDeadhangProgressSeconds = useCallback((elapsedSec: number) => {
    goalAlertsRef.current.onDeadhangProgress(elapsedSec, deadhangTargetSec)
  }, [deadhangTargetSec])

  // Timed exercise hooks
  const plank = useTimedExercise({
    initialState: initial.plankState,
    initialActualSec: initial.plankActualSec,
    initialSuccess: initial.plankSuccess,
    initialLogged: initial.alreadyLoggedPlankToday,
    targetSec: plankTargetSec,
    otherTimerRunning: false,
    onProgressSeconds: onPlankProgressSeconds,
    requestPersist,
    setSuspiciousSession,
  })

  const deadhang = useTimedExercise({
    initialState: initial.deadhangState,
    initialActualSec: initial.deadhangActualSec,
    initialSuccess: initial.deadhangSuccess,
    initialLogged: initial.alreadyLoggedDeadhangToday,
    targetSec: deadhangTargetSec,
    otherTimerRunning: false,
    onProgressSeconds: onDeadhangProgressSeconds,
    requestPersist,
    setSuspiciousSession,
  })

  // Mutual exclusion: only one timed exercise can run at a time
  const handlePlankStart = useCallback(() => {
    if (deadhang.state === 'RUNNING') return
    plank.handleStart()
  }, [deadhang.state, plank.handleStart])

  const handleDeadhangStart = useCallback(() => {
    if (plank.state === 'RUNNING') return
    deadhang.handleStart()
  }, [plank.state, deadhang.handleStart])

  // Reps exercise goal alert callbacks
  const squatGoalAlerts = useMemo(() => ({
    onProgress: (count: number, target: number) => goalAlertsRef.current.onSquatProgress(count, target),
  }), [])
  const pushupGoalAlerts = useMemo(() => ({
    onProgress: (count: number, target: number) => goalAlertsRef.current.onPushupProgress(count, target),
  }), [])
  const dumbbellGoalAlerts = useMemo(() => ({
    onProgress: (count: number, target: number) => goalAlertsRef.current.onDumbbellProgress(count, target),
  }), [])

  const showSaveFeedback = useCallback((target: CompleteSaveFeedbackTarget) => {
    clearCompleteSaveFeedbackTimer()
    setCompleteSaveFeedback({ target, text: 'Saving...', tone: 'info' })
  }, [clearCompleteSaveFeedbackTimer])

  const onSquatComplete = useCallback(() => {
    showSaveFeedback('squat')
  }, [showSaveFeedback])

  const onPushupComplete = useCallback(() => {
    showSaveFeedback('pushup')
  }, [showSaveFeedback])

  const onDumbbellComplete = useCallback(() => {
    showSaveFeedback('dumbbell')
  }, [showSaveFeedback])

  // Reps exercise hooks
  const squat = useRepsExercise({
    initialCount: initial.squatActualReps,
    initialTarget: initial.squatTargetReps,
    initialSuccess: initial.squatSuccess,
    initialCompleted: initial.squatCompleted,
    goalAlerts: squatGoalAlerts,
    persistReason: 'squat-complete',
    requestPersist,
    onComplete: onSquatComplete,
  })

  const pushup = useRepsExercise({
    initialCount: initial.pushupActualReps,
    initialTarget: initial.pushupTargetReps,
    initialSuccess: initial.pushupSuccess,
    initialCompleted: initial.pushupCompleted,
    goalAlerts: pushupGoalAlerts,
    persistReason: 'pushup-complete',
    requestPersist,
    onComplete: onPushupComplete,
  })

  const dumbbellExercise = useRepsExercise({
    initialCount: initial.dumbbellActualReps,
    initialTarget: initial.dumbbellTargetReps,
    initialSuccess: initial.dumbbellSuccess,
    initialCompleted: initial.dumbbellCompleted,
    goalAlerts: dumbbellGoalAlerts,
    persistReason: 'dumbbell-complete',
    requestPersist,
    onComplete: onDumbbellComplete,
  })

  const handleExportToHealth = useCallback(() => {
    if (!todayRecord) return
    try {
      const payload = buildHealthPayload(todayRecord)
      const shortcutUrl = buildShortcutRunUrl(payload, APPLE_HEALTH_SHORTCUT_NAME)
      if (typeof window === 'undefined') throw new Error('window is unavailable')
      window.location.href = shortcutUrl
      setHealthExportHint('')
    } catch (err) {
      console.warn('[handleExportToHealth] Health export failed:', err)
      setHealthExportHint(HEALTH_EXPORT_ERROR_HINT)
    }
  }, [todayRecord])

  function handleToggleExercise(id: ExerciseId, enabled: boolean) {
    const next: AppSettings = {
      ...appSettings,
      exercises: { ...appSettings.exercises, [id]: { enabled } },
    }
    setAppSettings(next)
    saveSettings(next)
    const nextActiveViews = getActiveNavViews(next)
    if (!nextActiveViews.includes(view)) {
      setView(nextActiveViews[0] ?? 'settings')
    }
  }

  function handleSettingsTargetChange(id: ExerciseId, value: number) {
    switch (id) {
      case 'plank': setPlankTargetSec(value); requestPersist(); break
      case 'squat': squat.setTarget(value); requestPersist(); break
      case 'pushup': pushup.setTarget(value); requestPersist(); break
      case 'deadhang': setDeadhangTargetSec(value); requestPersist(); break
      case 'dumbbell': dumbbellExercise.setTarget(value); requestPersist(); break
    }
  }

  // Swipe navigation
  const swipe = useSwipeNavigation({ activeNavViews, view, setView })

  // Visibility tracking
  useWorkoutVisibility(plank, deadhang)

  // Wake lock
  const wakeLockNotice = useWorkoutWakeLock(plank.state, deadhang.state, initialWakeLockNotice)

  // Persistence effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref.current values are intentionally excluded - refs are stable across renders
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

    const plankSessionElapsedMs = plank.logged ? (plank.completedElapsedMsRef.current || plank.result.actualSec * 1000) : 0
    const deadhangSessionElapsedMs = deadhang.logged
      ? (deadhang.completedElapsedMsRef.current || deadhang.result.actualSec * 1000)
      : 0

    const { draftRecord, flagSuspicious } = buildDailyRecord({
      today,
      plankTargetSec,
      plankResult: plank.result,
      plankLogged: plank.logged,
      plankVisibilityTracker: plank.visibilityTrackerRef.current,
      plankSessionElapsedMs,
      deadhangTargetSec,
      deadhangResult: deadhang.result,
      deadhangLogged: deadhang.logged,
      deadhangVisibilityTracker: deadhang.visibilityTrackerRef.current,
      deadhangSessionElapsedMs,
      squatTargetReps: squat.target,
      squatCount: squat.count,
      squatSuccess: squat.success,
      squatCompleted: squat.completed,
      pushupTargetReps: pushup.target,
      pushupCount: pushup.count,
      pushupSuccess: pushup.success,
      pushupCompleted: pushup.completed,
      dumbbellTargetReps: dumbbellExercise.target,
      dumbbellCount: dumbbellExercise.count,
      dumbbellSuccess: dumbbellExercise.success,
      dumbbellCompleted: dumbbellExercise.completed,
      nowMs: nowMs(),
    })

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
      if (feedbackTarget) scheduleCompleteSaveFeedbackSuccess(feedbackTarget)
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
    if (feedbackTarget) scheduleCompleteSaveFeedbackSuccess(feedbackTarget)
  }, [
    persistRequest,
    plank.logged,
    deadhang.logged,
    records,
    today,
    plankTargetSec,
    deadhangTargetSec,
    squat.target,
    pushup.target,
    plank.result,
    deadhang.result,
    squat.count,
    squat.success,
    pushup.count,
    pushup.success,
    dumbbellExercise.target,
    dumbbellExercise.count,
    dumbbellExercise.success,
    squat.completed,
    pushup.completed,
    dumbbellExercise.completed,
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
              elapsedMs={plank.elapsedMs}
              targetSec={plankTargetSec}
              state={plank.state}
              tomorrowTargetSec={tomorrowTargets.plank}
              tomorrowDeltaSec={tomorrowTargets.plank - plankTargetSec}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.plankReason, 'plank')}
              startDisabled={deadhang.state === 'RUNNING'}
              onStart={handlePlankStart}
              onPause={plank.handlePause}
              onResume={plank.handleResume}
              onCancel={plank.handleCancel}
            />
            {wakeLockNotice ? <div className="wake-lock-notice">{wakeLockNotice}</div> : null}
          </>
        )
      case 'squat':
        {
          const squatSaveFeedback = completeSaveFeedback?.target === 'squat' ? completeSaveFeedback : null
          return (
            <SquatCounter
              count={squat.count}
              targetReps={squat.target}
              showRecommendation={squat.completed}
              tomorrowTargetReps={tomorrowTargets.squat}
              tomorrowDeltaReps={tomorrowTargets.squat - squat.target}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.squatReason, 'squat')}
              saveFeedbackText={squatSaveFeedback?.text}
              saveFeedbackTone={squatSaveFeedback?.tone}
              onDoneRepsChange={squat.handleDoneRepsChange}
              onTargetRepsChange={squat.handleTargetRepsChange}
              onComplete={squat.handleComplete}
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
              count={pushup.count}
              targetReps={pushup.target}
              showRecommendation={pushup.completed}
              tomorrowTargetReps={tomorrowTargets.pushup}
              tomorrowDeltaReps={tomorrowTargets.pushup - pushup.target}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.pushupReason, 'pushup')}
              saveFeedbackText={pushupSaveFeedback?.text}
              saveFeedbackTone={pushupSaveFeedback?.tone}
              onDoneRepsChange={pushup.handleDoneRepsChange}
              onTargetRepsChange={pushup.handleTargetRepsChange}
              onComplete={pushup.handleComplete}
            />
          )
        }
      case 'deadhang':
        return (
          <>
            <PlankTimer
              title="Deadhang Timer"
              elapsedMs={deadhang.elapsedMs}
              targetSec={deadhangTargetSec}
              state={deadhang.state}
              tomorrowTargetSec={tomorrowTargets.deadhang}
              tomorrowDeltaSec={tomorrowTargets.deadhang - deadhangTargetSec}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.deadhangReason, 'deadhang')}
              startDisabled={plank.state === 'RUNNING'}
              onStart={handleDeadhangStart}
              onPause={deadhang.handlePause}
              onResume={deadhang.handleResume}
              onCancel={deadhang.handleCancel}
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
              count={dumbbellExercise.count}
              targetReps={dumbbellExercise.target}
              showRecommendation={dumbbellExercise.completed}
              tomorrowTargetReps={tomorrowTargets.dumbbell}
              tomorrowDeltaReps={tomorrowTargets.dumbbell - dumbbellExercise.target}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.dumbbellReason, 'dumbbell')}
              saveFeedbackText={dumbbellSaveFeedback?.text}
              saveFeedbackTone={dumbbellSaveFeedback?.tone}
              onDoneRepsChange={dumbbellExercise.handleDoneRepsChange}
              onTargetRepsChange={dumbbellExercise.handleTargetRepsChange}
              onComplete={dumbbellExercise.handleComplete}
            />
          )
        }
      case 'overview':
        return (
          <WorkoutOverview
            plankTargetSec={plankTargetSec}
            squatTargetReps={squat.target}
            pushupTargetReps={pushup.target}
            deadhangTargetSec={deadhangTargetSec}
            dumbbellTargetReps={dumbbellExercise.target}
            tomorrowPlankTargetSec={tomorrowTargets.plank}
            tomorrowSquatTargetReps={tomorrowTargets.squat}
            tomorrowPushupTargetReps={tomorrowTargets.pushup}
            tomorrowDeadhangTargetSec={tomorrowTargets.deadhang}
            tomorrowDumbbellTargetReps={tomorrowTargets.dumbbell}
            plankSuccess={plank.result.success}
            squatSuccess={squat.success}
            pushupSuccess={pushup.success}
            deadhangSuccess={deadhang.result.success}
            dumbbellSuccess={dumbbellExercise.success}
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
              { id: 'squat', label: 'Squat', currentTarget: squat.target, unit: 'reps' },
              { id: 'pushup', label: 'Pushup', currentTarget: pushup.target, unit: 'reps' },
              { id: 'deadhang', label: 'Deadhang', currentTarget: deadhangTargetSec, unit: 's' },
              { id: 'dumbbell', label: 'Dumbbell', currentTarget: dumbbellExercise.target, unit: 'reps' },
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
          onPointerDown={swipe.handlePointerDown}
          onPointerUp={swipe.handlePointerUp}
          onPointerCancel={swipe.handlePointerCancel}
          onPointerLeave={swipe.handlePointerLeave}
          onLostPointerCapture={swipe.handleLostPointerCapture}
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
