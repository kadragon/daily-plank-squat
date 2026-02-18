import { useEffect, useRef, useState } from 'react'
import DailySummary from './components/daily-summary'
import PlankTimer from './components/plank-timer'
import SquatCounter from './components/squat-counter'
import { computeNextTarget, computeSquatTarget } from './models/fatigue'
import { createPlankTimer, type PlankTimer as DomainPlankTimer } from './models/plank-timer'
import {
  complete as completeSquatCounter,
  createSquatCounter,
  decrement as decrementSquatCounter,
  increment as incrementSquatCounter,
  type SquatCounter as DomainSquatCounter,
} from './models/squat-counter'
import type { ExerciseRecord, FatigueParams, PlankState, SquatRecord } from './types'

type AppView = 'plank' | 'squat' | 'summary'

interface AppProps {
  initialView?: AppView
  initialPlankState?: PlankState
}

const BASE_PLANK_TARGET_SEC = 60
const BASE_SQUAT_TARGET_COUNT = 20
const DEFAULT_PARAMS: FatigueParams = {
  age: 30,
  weight: 70,
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export default function App({ initialView = 'plank', initialPlankState }: AppProps) {
  const plankTimerRef = useRef<DomainPlankTimer | null>(null)
  const squatCounterRef = useRef<DomainSquatCounter | null>(null)
  if (plankTimerRef.current === null) {
    plankTimerRef.current = createPlankTimer()
  }
  if (squatCounterRef.current === null) {
    squatCounterRef.current = createSquatCounter()
  }

  const [view, setView] = useState<AppView>(initialView)
  const [plankState, setPlankState] = useState<PlankState>(
    initialPlankState ?? plankTimerRef.current.state(),
  )
  const [elapsedMs, setElapsedMs] = useState(0)
  const [plankResult, setPlankResult] = useState({ actualSec: 0, success: false })

  const [squatCount, setSquatCount] = useState(squatCounterRef.current.count)
  const [squatSuccess, setSquatSuccess] = useState(false)

  useEffect(() => {
    if (plankState !== 'RUNNING') return undefined

    const interval = setInterval(() => {
      setElapsedMs(plankTimerRef.current?.getCurrentElapsed(nowMs()) ?? 0)
    }, 250)

    return () => clearInterval(interval)
  }, [plankState])

  function syncPlankState() {
    const now = nowMs()
    setPlankState(plankTimerRef.current?.state() ?? 'IDLE')
    setElapsedMs(plankTimerRef.current?.getCurrentElapsed(now) ?? 0)
  }

  function handlePlankStart() {
    plankTimerRef.current?.start(nowMs())
    setPlankResult({ actualSec: 0, success: false })
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
    plankTimerRef.current?.cancel()
    setPlankResult({ actualSec: 0, success: false })
    syncPlankState()
  }

  function handlePlankComplete() {
    const result = plankTimerRef.current?.complete(nowMs())
    if (result) {
      setPlankResult({ actualSec: result.actual_sec, success: result.success })
    }
    syncPlankState()
  }

  function handleSquatIncrement() {
    incrementSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatCount(squatCounterRef.current?.count ?? 0)
  }

  function handleSquatDecrement() {
    decrementSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatCount(squatCounterRef.current?.count ?? 0)
  }

  function handleSquatComplete() {
    completeSquatCounter(squatCounterRef.current as DomainSquatCounter)
    setSquatSuccess(true)
  }

  const plankHistory: ExerciseRecord[] = plankState === 'COMPLETED' || plankState === 'CANCELLED'
    ? [{
      target_sec: BASE_PLANK_TARGET_SEC,
      actual_sec: plankResult.actualSec,
      success: plankResult.success,
    }]
    : []
  const squatHistory: SquatRecord[] = squatSuccess
    ? [{
      target_count: BASE_SQUAT_TARGET_COUNT,
      actual_count: squatCount,
      success: true,
    }]
    : []

  const plankTargetSec = computeNextTarget(
    BASE_PLANK_TARGET_SEC,
    plankHistory,
    DEFAULT_PARAMS,
  )
  const squatTargetCount = computeSquatTarget(
    BASE_SQUAT_TARGET_COUNT,
    squatHistory,
    DEFAULT_PARAMS,
  )

  function renderView() {
    switch (view) {
      case 'plank':
        return (
          <PlankTimer
            elapsedMs={elapsedMs}
            state={plankState}
            onStart={handlePlankStart}
            onPause={handlePlankPause}
            onResume={handlePlankResume}
            onCancel={handlePlankCancel}
            onComplete={handlePlankComplete}
          />
        )
      case 'squat':
        return (
          <SquatCounter
            count={squatCount}
            onIncrement={handleSquatIncrement}
            onDecrement={handleSquatDecrement}
            onComplete={handleSquatComplete}
          />
        )
      case 'summary':
        return (
          <DailySummary
            plankTargetSec={plankTargetSec}
            squatTargetCount={squatTargetCount}
            plankSuccess={plankResult.success}
            squatSuccess={squatSuccess}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      <h1>Daily Plank & Squat</h1>
      <nav>
        <button type="button" onClick={() => setView('plank')}>Plank</button>
        <button type="button" onClick={() => setView('squat')}>Squat</button>
        <button type="button" onClick={() => setView('summary')}>Summary</button>
      </nav>
      {renderView()}
    </div>
  )
}
