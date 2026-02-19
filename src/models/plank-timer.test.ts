import { describe, expect, test } from 'bun:test'
import { createPlankTimer } from './plank-timer'

describe('PlankTimer integration', () => {
  test('Start creates RUNNING and begins timing', () => {
    const pt = createPlankTimer()
    pt.start(1000)
    expect(pt.state()).toBe('RUNNING')
    expect(pt.getCurrentElapsed(1500)).toBe(500)
  })

  test('Pause freezes elapsed', () => {
    const pt = createPlankTimer()
    pt.start(1000)
    pt.pause(2000)
    expect(pt.state()).toBe('PAUSED')
    expect(pt.getCurrentElapsed(5000)).toBe(1000)
  })

  test('Resume continues timing', () => {
    const pt = createPlankTimer()
    pt.start(1000)
    pt.pause(2000)
    pt.resume(3000)
    expect(pt.state()).toBe('RUNNING')
    expect(pt.getCurrentElapsed(4000)).toBe(2000)
  })

  test('Complete records actual_sec as floor(elapsed/1000)', () => {
    const pt = createPlankTimer()
    pt.start(0)
    const record = pt.complete(5500)
    expect(pt.state()).toBe('COMPLETED')
    expect(record.actual_sec).toBe(5)
    expect(record.success).toBe(true)
  })

  test('Cancel stores elapsed-based actual_sec and success=false', () => {
    const pt = createPlankTimer()
    pt.start(0)
    const record = pt.cancel(3499)
    expect(pt.state()).toBe('CANCELLED')
    expect(record.success).toBe(false)
    expect(record.actual_sec).toBe(3)
  })

  test('Ignoring duplicate start does not create overlapping timer segments', () => {
    const pt = createPlankTimer()
    pt.start(0)
    pt.start(100)
    expect(pt.state()).toBe('RUNNING')
    expect(pt.getCurrentElapsed(1100)).toBe(1100)
  })

  test('Complete returns unsuccessful record when transition is invalid', () => {
    const pt = createPlankTimer()
    const record = pt.complete(1000)
    expect(pt.state()).toBe('IDLE')
    expect(record.success).toBe(false)
    expect(record.actual_sec).toBe(0)
  })

  test('Supports COUNTDOWN state before RUNNING', () => {
    const pt = createPlankTimer()
    pt.startCountdown(0)
    expect(pt.state()).toBe('COUNTDOWN')
    pt.countdownDone(0)
    expect(pt.state()).toBe('RUNNING')
  })

  test('Cancel during COUNTDOWN transitions to CANCELLED with 0 elapsed', () => {
    const pt = createPlankTimer()
    pt.startCountdown(0)
    const record = pt.cancel(500)
    expect(pt.state()).toBe('CANCELLED')
    expect(record.success).toBe(false)
    expect(record.actual_sec).toBe(0)
  })
})
