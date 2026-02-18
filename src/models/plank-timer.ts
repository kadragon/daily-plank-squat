import { createPlankStateMachine } from './plank-state-machine'
import { createTimer, startTimer, pauseTimer, resumeTimer, completeTimer, getCurrentElapsed } from './timer'
import type { PlankState, ExerciseRecord } from '../types'

export interface PlankTimer {
  state(): PlankState
  getCurrentElapsed(now: number): number
  start(now: number): void
  pause(now: number): void
  resume(now: number): void
  complete(now: number): ExerciseRecord
  cancel(): { success: false }
}

export function createPlankTimer(): PlankTimer {
  const machine = createPlankStateMachine()
  const timer = createTimer()

  return {
    state() { return machine.state },
    getCurrentElapsed(now) { return getCurrentElapsed(timer, now) },
    start(now) {
      machine.send('start')
      startTimer(timer, now)
    },
    pause(now) {
      machine.send('pause')
      pauseTimer(timer, now)
    },
    resume(now) {
      machine.send('resume')
      resumeTimer(timer, now)
    },
    complete(now) {
      machine.send('complete')
      completeTimer(timer, now)
      return { actual_sec: Math.floor(getCurrentElapsed(timer, now) / 1000), success: true }
    },
    cancel() {
      machine.send('cancel')
      return { success: false }
    },
  }
}
