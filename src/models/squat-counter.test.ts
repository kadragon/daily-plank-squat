import { describe, test, expect } from 'bun:test'
import {
  complete,
  createSquatCounter,
  decrement,
  increment,
  sanitizeDoneReps,
  sanitizeTargetReps,
  sanitizeRawInput,
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

  test('sanitizeRawInput returns error for empty string', () => {
    const result = sanitizeRawInput('')
    expect(result).toEqual({ value: 0, error: '값을 입력해 주세요' })
  })

  test('sanitizeRawInput returns error for non-numeric string', () => {
    const result = sanitizeRawInput('abc')
    expect(result).toEqual({ value: 0, error: '숫자만 입력해 주세요' })
  })

  test('sanitizeRawInput strips leading zeros', () => {
    const result = sanitizeRawInput('038')
    expect(result).toEqual({ value: 38, error: null })
  })

  test('sanitizeRawInput handles "0" as valid input', () => {
    const result = sanitizeRawInput('0')
    expect(result).toEqual({ value: 0, error: null })
  })

  test('sanitizeRawInput handles normal number string', () => {
    const result = sanitizeRawInput('100')
    expect(result).toEqual({ value: 100, error: null })
  })
})
