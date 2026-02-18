import { describe, test, expect } from 'bun:test'
import { createSquatCounter, increment, decrement, complete } from './squat-counter'

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
})
