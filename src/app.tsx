import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PlankTimer from './components/plank-timer'
import RepsCounter from './components/reps-counter'
import Settings from './components/settings'
import SquatCounter from './components/squat-counter'
import TodayWorkout, { type TodayExerciseCard } from './components/today-workout'
import WorkoutHistory from './components/workout-history'
import { useRepsExercise } from './hooks/use-reps-exercise'
import { useSwipeNavigation } from './hooks/use-swipe-navigation'
import { useTimedExercise } from './hooks/use-timed-exercise'
import { useWorkoutVisibility } from './hooks/use-workout-visibility'
import { useWorkoutWakeLock } from './hooks/use-workout-wake-lock'
import {
  BEGINNER_DAYS,
  computeDayType,
  computeLatestFatigueSnapshot,
  computeTomorrowPlan,
} from './models/fatigue'
import { createGoalAlerts, playGoalFeedback } from './models/goal-alerts'
import {
  type AppView,
  TAB_ITEMS,
  getActiveTab,
  getEnabledExerciseViews,
  getNextExerciseView,
  isWorkoutView,
  isScrollableView,
  resolveView,
} from './models/navigation'
import { TabIcon } from './components/tab-icon'
import { saveRecord } from './storage/daily-record'
import { buildHealthPayload, buildShortcutRunUrl } from './integrations/apple-health-shortcut'
import {
  APP_COPY,
  DETAIL_COPY,
  EXERCISE_LABEL,
  REPS_COPY,
  REPS_UNIT,
  SAVE_FEEDBACK,
  SECONDS_UNIT,
  TIMER_COPY,
  formatReps,
  formatSeconds,
  formatTomorrowRecommendation,
  getRecommendationReasonText,
} from './locales/ko'
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

export default function App({ initialView = 'today', initialPlankState, initialWakeLockNotice }: AppProps) {
  const initial = useRef(createInitialAppState(initialPlankState)).current
  const today = useMemo(() => todayKey(), [])

  const goalAlertsRef = useRef(createGoalAlerts(() => playGoalFeedback()))
  const lastSavedSnapshotRef = useRef('')

  const [records, setRecords] = useState<DailyRecord[]>(initial.records)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadSettings())
  const enabledExerciseViews = useMemo(() => getEnabledExerciseViews(appSettings), [appSettings])
  const [view, setView] = useState<AppView>(() => resolveView(initialView, appSettings))
  const activeTab = getActiveTab(view)

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
    dayType: initial.tomorrowDayType,
  })
  const todayRecord = useMemo(() => records.find((record) => record.date === today) ?? null, [records, today])
  const summaryHealthHint = healthExportHint || (todayRecord?.flag_suspicious ? APP_COPY.suspiciousExportHint : '')

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
    initialInactiveTimeRatio: initial.plankInactiveTimeRatio,
    targetSec: plankTargetSec,
    countdownSec: appSettings.countdownSec,
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
    initialInactiveTimeRatio: initial.deadhangInactiveTimeRatio,
    targetSec: deadhangTargetSec,
    countdownSec: appSettings.countdownSec,
    otherTimerRunning: false,
    onProgressSeconds: onDeadhangProgressSeconds,
    requestPersist,
    setSuspiciousSession,
  })

  // Mutual exclusion: only one timed exercise can run at a time
  const handlePlankStart = useCallback(() => {
    if (deadhang.state === 'RUNNING' || deadhang.state === 'COUNTDOWN') return
    plank.handleStart()
  }, [deadhang.state, plank.handleStart])

  const handleDeadhangStart = useCallback(() => {
    if (plank.state === 'RUNNING' || plank.state === 'COUNTDOWN') return
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
    setCompleteSaveFeedback({ target, text: SAVE_FEEDBACK.saving, tone: 'info' })
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
      setHealthExportHint(APP_COPY.healthExportError)
    }
  }, [todayRecord])

  function handleToggleExercise(id: ExerciseId, enabled: boolean) {
    const next: AppSettings = {
      ...appSettings,
      exercises: { ...appSettings.exercises, [id]: { enabled } },
    }
    setAppSettings(next)
    saveSettings(next)
    setView((current) => resolveView(current, next))
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
  const swipe = useSwipeNavigation({ activeNavViews: enabledExerciseViews, view, setView })

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
        setCompleteSaveFeedback({ target, text: SAVE_FEEDBACK.saved, tone: 'success' })
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

    const withoutToday = records.filter((record) => record.date !== today)
    const todayDayType = computeDayType(withoutToday, today, withoutToday.length < BEGINNER_DAYS)

    const { draftRecord, flagSuspicious } = buildDailyRecord({
      today,
      plankTargetSec,
      plankResult: plank.result,
      plankLogged: plank.logged,
      plankCancelled: plank.cancelled,
      plankVisibilityTracker: plank.loggedVisibilityTrackerRef.current,
      plankSessionElapsedMs,
      deadhangTargetSec,
      deadhangResult: deadhang.result,
      deadhangLogged: deadhang.logged,
      deadhangCancelled: deadhang.cancelled,
      deadhangVisibilityTracker: deadhang.loggedVisibilityTrackerRef.current,
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
      dayType: todayDayType,
      nowMs: nowMs(),
    })
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
        setCompleteSaveFeedback({ target: feedbackTarget, text: SAVE_FEEDBACK.failed, tone: 'error' })
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
      dayType: tomorrowPlan.day_type,
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

  const exerciseProgress: Record<ExerciseId, {
    actual: number
    target: number
    tomorrowTarget: number
    success: boolean
    finished: boolean
    format: (value: number) => string
  }> = {
    plank: { actual: plank.result.actualSec, target: plankTargetSec, tomorrowTarget: tomorrowTargets.plank, success: plank.result.success, finished: plank.logged, format: formatSeconds },
    squat: { actual: squat.count, target: squat.target, tomorrowTarget: tomorrowTargets.squat, success: squat.success, finished: squat.completed, format: formatReps },
    pushup: { actual: pushup.count, target: pushup.target, tomorrowTarget: tomorrowTargets.pushup, success: pushup.success, finished: pushup.completed, format: formatReps },
    deadhang: { actual: deadhang.result.actualSec, target: deadhangTargetSec, tomorrowTarget: tomorrowTargets.deadhang, success: deadhang.result.success, finished: deadhang.logged, format: formatSeconds },
    dumbbell: { actual: dumbbellExercise.count, target: dumbbellExercise.target, tomorrowTarget: tomorrowTargets.dumbbell, success: dumbbellExercise.success, finished: dumbbellExercise.completed, format: formatReps },
  }

  const todayCards: TodayExerciseCard[] = enabledExerciseViews.map((id) => {
    const { actual, target, tomorrowTarget, success, finished, format } = exerciseProgress[id]
    // Completed = target met; the recommendation follows the exercise screen's own reveal rule.
    return {
      id,
      label: EXERCISE_LABEL[id],
      actual: format(actual),
      target: format(target),
      completed: success,
      recommendationText: finished ? formatTomorrowRecommendation(tomorrowTarget, tomorrowTarget - target, format) : undefined,
    }
  })

  function openNextExercise(current: ExerciseId) {
    setView(getNextExerciseView(current, enabledExerciseViews, (id) => exerciseProgress[id].success))
  }

  function renderView() {
    switch (view) {
      case 'plank':
        return (
          <>
            <PlankTimer
              elapsedMs={plank.elapsedMs}
              targetSec={plankTargetSec}
              state={plank.state}
              countdownMs={plank.countdownMs}
              tomorrowTargetSec={tomorrowTargets.plank}
              tomorrowDeltaSec={tomorrowTargets.plank - plankTargetSec}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.plankReason, 'plank')}
              keptResultSec={plank.earlierResultKept ? plank.result.actualSec : null}
              startDisabled={deadhang.state === 'RUNNING' || deadhang.state === 'COUNTDOWN'}
              onStart={handlePlankStart}
              onPause={plank.handlePause}
              onResume={plank.handleResume}
              onCancel={plank.handleCancel}
              onNext={() => openNextExercise('plank')}
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
              onComplete={squat.handleComplete}
            />
          )
        }
      case 'pushup':
        {
          const pushupSaveFeedback = completeSaveFeedback?.target === 'pushup' ? completeSaveFeedback : null
          return (
            <RepsCounter
              key="pushup"
              title={REPS_COPY.pushupTitle}
              idPrefix="pushup"
              exerciseName={EXERCISE_LABEL.pushup}
              count={pushup.count}
              targetReps={pushup.target}
              showRecommendation={pushup.completed}
              tomorrowTargetReps={tomorrowTargets.pushup}
              tomorrowDeltaReps={tomorrowTargets.pushup - pushup.target}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.pushupReason, 'pushup')}
              saveFeedbackText={pushupSaveFeedback?.text}
              saveFeedbackTone={pushupSaveFeedback?.tone}
              onDoneRepsChange={pushup.handleDoneRepsChange}
              onComplete={pushup.handleComplete}
            />
          )
        }
      case 'deadhang':
        return (
          <>
            <PlankTimer
              title={TIMER_COPY.deadhangTitle}
              elapsedMs={deadhang.elapsedMs}
              targetSec={deadhangTargetSec}
              state={deadhang.state}
              countdownMs={deadhang.countdownMs}
              tomorrowTargetSec={tomorrowTargets.deadhang}
              tomorrowDeltaSec={tomorrowTargets.deadhang - deadhangTargetSec}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.deadhangReason, 'deadhang')}
              keptResultSec={deadhang.earlierResultKept ? deadhang.result.actualSec : null}
              startDisabled={plank.state === 'RUNNING' || plank.state === 'COUNTDOWN'}
              onStart={handleDeadhangStart}
              onPause={deadhang.handlePause}
              onResume={deadhang.handleResume}
              onCancel={deadhang.handleCancel}
              onNext={() => openNextExercise('deadhang')}
            />
            {wakeLockNotice ? <div className="wake-lock-notice">{wakeLockNotice}</div> : null}
          </>
        )
      case 'dumbbell':
        {
          const dumbbellSaveFeedback = completeSaveFeedback?.target === 'dumbbell' ? completeSaveFeedback : null
          return (
            <RepsCounter
              key="dumbbell"
              title={REPS_COPY.dumbbellTitle}
              idPrefix="dumbbell"
              exerciseName={EXERCISE_LABEL.dumbbell}
              count={dumbbellExercise.count}
              targetReps={dumbbellExercise.target}
              showRecommendation={dumbbellExercise.completed}
              tomorrowTargetReps={tomorrowTargets.dumbbell}
              tomorrowDeltaReps={tomorrowTargets.dumbbell - dumbbellExercise.target}
              recommendationReasonText={getRecommendationReasonText(tomorrowTargets.dumbbellReason, 'dumbbell')}
              saveFeedbackText={dumbbellSaveFeedback?.text}
              saveFeedbackTone={dumbbellSaveFeedback?.tone}
              onDoneRepsChange={dumbbellExercise.handleDoneRepsChange}
              onComplete={dumbbellExercise.handleComplete}
            />
          )
        }
      case 'today':
        return (
          <TodayWorkout
            exercises={todayCards}
            tomorrowDayType={tomorrowTargets.dayType}
            fatigue={fatigue}
            overloadWarning={overloadWarning}
            suspiciousSession={suspiciousSession}
            onOpenExercise={setView}
            onExportToHealth={handleExportToHealth}
            healthExportEnabled={todayRecord !== null}
            healthExportHint={summaryHealthHint}
          />
        )
      case 'history':
        return <WorkoutHistory records={records} />
      case 'settings':
        return (
          <Settings
            settings={appSettings}
            exerciseTargets={[
              { id: 'plank', label: EXERCISE_LABEL.plank, currentTarget: plankTargetSec, unit: SECONDS_UNIT },
              { id: 'squat', label: EXERCISE_LABEL.squat, currentTarget: squat.target, unit: REPS_UNIT },
              { id: 'pushup', label: EXERCISE_LABEL.pushup, currentTarget: pushup.target, unit: REPS_UNIT },
              { id: 'deadhang', label: EXERCISE_LABEL.deadhang, currentTarget: deadhangTargetSec, unit: SECONDS_UNIT },
              { id: 'dumbbell', label: EXERCISE_LABEL.dumbbell, currentTarget: dumbbellExercise.target, unit: REPS_UNIT },
            ]}
            onToggleExercise={handleToggleExercise}
            onChangeTarget={handleSettingsTargetChange}
            onChangeCountdownSec={(value) => {
              const next: AppSettings = { ...appSettings, countdownSec: value }
              setAppSettings(next)
              saveSettings(next)
            }}
            onRestored={() => window.location.reload()}
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
          <h1 className="app-title">{APP_COPY.title}</h1>
          <p className="app-subtitle">{APP_COPY.subtitle}</p>
        </header>
        <main
          className={`main-content${isWorkoutView(view) ? ' main-content--workout main-content--swipe' : ''}`}
          onPointerDown={swipe.handlePointerDown}
          onPointerUp={swipe.handlePointerUp}
          onPointerCancel={swipe.handlePointerCancel}
          onPointerLeave={swipe.handlePointerLeave}
          onLostPointerCapture={swipe.handleLostPointerCapture}
        >
          {isWorkoutView(view) ? (
            <div className="detail-header" data-swipe-ignore="true">
              <button
                type="button"
                className="detail-header__back"
                aria-label={DETAIL_COPY.backAriaLabel}
                onClick={() => setView('today')}
              >
                <span aria-hidden="true">←</span> {DETAIL_COPY.back}
              </button>
              <fieldset className="detail-header__chips" aria-label={DETAIL_COPY.chipsAriaLabel}>
                {enabledExerciseViews.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`exercise-chip${view === id ? ' exercise-chip--active' : ''}`}
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                  >
                    {EXERCISE_LABEL[id]}
                  </button>
                ))}
              </fieldset>
            </div>
          ) : null}
          <div className={`view-stage${isScrollableView(view) ? ' view-stage--scrollable' : ''}`}>
            {renderView()}
          </div>
        </main>
        <nav className="nav app-tabbar" aria-label={APP_COPY.navLabel} data-swipe-ignore="true">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.tab}
              type="button"
              className={`nav-btn app-tabbar__button${activeTab === item.tab ? ' app-tabbar__button--active' : ''}`}
              aria-current={activeTab === item.tab ? 'page' : undefined}
              onClick={() => setView(item.tab)}
            >
              <TabIcon tab={item.tab} />
              <span className="app-tabbar__label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
