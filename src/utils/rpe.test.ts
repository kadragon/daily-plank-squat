import { expect, test } from 'bun:test'
import { NEUTRAL_RPE, normalizeRpe } from './rpe'

test('normalizeRpe returns floored value for valid 1~10 range', () => {
  expect(normalizeRpe(1)).toBe(1)
  expect(normalizeRpe(10)).toBe(10)
  expect(normalizeRpe(7.9)).toBe(7)
})

test('normalizeRpe returns neutral rpe for invalid values', () => {
  expect(normalizeRpe(0)).toBe(NEUTRAL_RPE)
  expect(normalizeRpe(11)).toBe(NEUTRAL_RPE)
  expect(normalizeRpe('bad')).toBe(NEUTRAL_RPE)
  expect(normalizeRpe(NaN)).toBe(NEUTRAL_RPE)
})
