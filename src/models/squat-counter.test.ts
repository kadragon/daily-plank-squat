import { describe, test, expect } from 'bun:test'
import {
  complete,
  createSquatCounter,
  decrement,
  increment,
  sanitizeDoneReps,
  sanitizeTargetReps,
} from './squat-counter'

describe('Squat Counter', () => {
  test('count starts at 0', () => {
    const counter = createSquatCounter()
    expect(counter.count).toBe(0)
  })

  test('increment adds 1', () => {
    const counter = createSquatCounter()
    increment(counter)
    expect(counter.count).toBe(1)
  })

  test('decrement subtracts 1, floor at 0', () => {
    const counter = createSquatCounter()
    increment(counter)
    decrement(counter)
    expect(counter.count).toBe(0)
  })

  test('cannot go below 0', () => {
    const counter = createSquatCounter()
    decrement(counter)
    expect(counter.count).toBe(0)
  })

  test('complete returns final count', () => {
    const counter = createSquatCounter()
    increment(counter)
    increment(counter)
    increment(counter)
    expect(complete(counter)).toBe(3)
  })

  test('sanitizeDoneReps floors decimals and clamps invalid/negative values to 0', () => {
    expect(sanitizeDoneReps(12.8)).toBe(12)
    expect(sanitizeDoneReps(-1)).toBe(0)
    expect(sanitizeDoneReps(Number.NaN)).toBe(0)
    expect(sanitizeDoneReps(Number.POSITIVE_INFINITY)).toBe(0)
  })

  test('sanitizeTargetReps floors decimals and clamps invalid/less-than-one values to 1', () => {
    expect(sanitizeTargetReps(20.9)).toBe(20)
    expect(sanitizeTargetReps(0)).toBe(1)
    expect(sanitizeTargetReps(-3)).toBe(1)
    expect(sanitizeTargetReps(Number.NaN)).toBe(1)
  })
})
