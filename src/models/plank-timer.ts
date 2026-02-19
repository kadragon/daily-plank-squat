import { createPlankStateMachine } from './plank-state-machine'
import { createTimer, startTimer, pauseTimer, resumeTimer, completeTimer, getCurrentElapsed } from './timer'
import type { ExerciseRecord, PlankState } from '../types'

type PlankResult = Pick<ExerciseRecord, 'actual_sec' | 'success'>

export interface PlankTimer {
  state(): PlankState
  getCurrentElapsed(now: number): number
  start(now: number): void
  startCountdown(now: number): void
  countdownDone(now: number): void
  pause(now: number): void
  resume(now: number): void
  complete(now: number): PlankResult
  cancel(now: number): PlankResult
}

function toPlankResult(elapsedMs: number, success: boolean): PlankResult {
  return {
    actual_sec: Math.max(0, Math.floor(elapsedMs / 1000)),
    success,
  }
}

export function createPlankTimer(): PlankTimer {
  const machine = createPlankStateMachine()
  const timer = createTimer()

  return {
    state() { return machine.state },
    getCurrentElapsed(now) { return getCurrentElapsed(timer, now) },
    start(now) {
      if (machine.state !== 'IDLE') return
      machine.send('start')
      startTimer(timer, now)
    },
    startCountdown(_now) {
      if (machine.state !== 'IDLE') return
      machine.send('countdown')
    },
    countdownDone(now) {
      if (machine.state !== 'COUNTDOWN') return
      machine.send('countdown_done')
      startTimer(timer, now)
    },
    pause(now) {
      if (machine.state !== 'RUNNING') return
      machine.send('pause')
      pauseTimer(timer, now)
    },
    resume(now) {
      if (machine.state !== 'PAUSED') return
      machine.send('resume')
      resumeTimer(timer, now)
    },
    complete(now) {
      if (machine.state !== 'RUNNING') {
        return toPlankResult(getCurrentElapsed(timer, now), false)
      }

      machine.send('complete')
      completeTimer(timer, now)
      return toPlankResult(getCurrentElapsed(timer, now), true)
    },
    cancel(now) {
      if (machine.state !== 'RUNNING' && machine.state !== 'PAUSED' && machine.state !== 'COUNTDOWN') {
        return toPlankResult(getCurrentElapsed(timer, now), false)
      }

      if (machine.state === 'RUNNING') {
        pauseTimer(timer, now)
      }

      machine.send('cancel')
      return toPlankResult(getCurrentElapsed(timer, now), false)
    },
  }
}
