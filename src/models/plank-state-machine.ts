import type { PlankState, PlankEvent } from '../types'

export interface PlankStateMachine {
  state: PlankState
  send(event: PlankEvent): void
}

export function createPlankStateMachine(): PlankStateMachine {
  const machine = {
    state: 'IDLE' as PlankState,
    send(event: PlankEvent) {
      machine.state = transition(machine.state, event)
    },
  }
  return machine
}

export function transition(state: PlankState, event: PlankEvent): PlankState {
  if (state === 'IDLE' && event === 'start') return 'RUNNING'
  if (state === 'IDLE' && event === 'countdown') return 'COUNTDOWN'
  if (state === 'COUNTDOWN' && event === 'countdown_done') return 'RUNNING'
  if (state === 'COUNTDOWN' && event === 'cancel') return 'CANCELLED'
  if (state === 'RUNNING' && event === 'pause') return 'PAUSED'
  if (state === 'PAUSED' && event === 'resume') return 'RUNNING'
  if (state === 'RUNNING' && event === 'complete') return 'COMPLETED'
  if ((state === 'RUNNING' || state === 'PAUSED') && event === 'cancel') return 'CANCELLED'
  return state
}
