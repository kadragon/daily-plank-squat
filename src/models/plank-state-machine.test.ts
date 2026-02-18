import { describe, test, expect } from 'vitest'
import { createPlankStateMachine, type PlankStateMachine } from './plank-state-machine'

describe('Plank State Machine', () => {
  test('initial state is IDLE', () => {
    const machine = createPlankStateMachine()
    expect(machine.state).toBe('IDLE')
  })

  test('IDLE → RUNNING on start', () => {
    const machine = createPlankStateMachine()
    machine.send('start')
    expect(machine.state).toBe('RUNNING')
  })

  test('terminal states ignore all events', () => {
    const events: Parameters<PlankStateMachine['send']>[0][] = ['start', 'pause', 'resume', 'complete', 'cancel']

    const completed = createPlankStateMachine()
    completed.send('start')
    completed.send('complete')
    events.forEach(e => completed.send(e))
    expect(completed.state).toBe('COMPLETED')

    const cancelled = createPlankStateMachine()
    cancelled.send('start')
    cancelled.send('cancel')
    events.forEach(e => cancelled.send(e))
    expect(cancelled.state).toBe('CANCELLED')
  })

  test('IDLE ignores invalid events', () => {
    const machine = createPlankStateMachine()
    machine.send('pause')
    machine.send('resume')
    machine.send('complete')
    machine.send('cancel')
    expect(machine.state).toBe('IDLE')
  })

  test('PAUSED → CANCELLED on cancel', () => {
    const machine = createPlankStateMachine()
    machine.send('start')
    machine.send('pause')
    machine.send('cancel')
    expect(machine.state).toBe('CANCELLED')
  })

  test('RUNNING → CANCELLED on cancel', () => {
    const machine = createPlankStateMachine()
    machine.send('start')
    machine.send('cancel')
    expect(machine.state).toBe('CANCELLED')
  })

  test('RUNNING → COMPLETED on complete', () => {
    const machine = createPlankStateMachine()
    machine.send('start')
    machine.send('complete')
    expect(machine.state).toBe('COMPLETED')
  })

  test('PAUSED → RUNNING on resume', () => {
    const machine = createPlankStateMachine()
    machine.send('start')
    machine.send('pause')
    machine.send('resume')
    expect(machine.state).toBe('RUNNING')
  })

  test('RUNNING → PAUSED on pause', () => {
    const machine = createPlankStateMachine()
    machine.send('start')
    machine.send('pause')
    expect(machine.state).toBe('PAUSED')
  })
})
