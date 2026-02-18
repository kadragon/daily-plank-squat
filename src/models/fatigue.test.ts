import { test, expect } from "bun:test"
import {
  computeNextTarget,
  computeSquatTarget,
  normalizePerformance,
  computeLoad,
  computeRampStress,
  updateEWMA,
  ALPHA_P,
  ALPHA_S,
  computeFTotal,
  MEDIAN_THRESHOLD,
  computeFatigueScore,
} from "./fatigue"
import type { FatigueParams } from "../types"

const params: FatigueParams = { age: 30, weight: 70 }

test("returns base target with no history for plank", () => {
  expect(computeNextTarget(60, [], params)).toBe(60)
})

test("returns base target with no history for squat", () => {
  expect(computeSquatTarget(20, [], params)).toBe(20)
})

test("computes normalized performance ratio r_e clipped to [0, 1.5]", () => {
  expect(normalizePerformance(30, 60)).toBeCloseTo(0.5)
  expect(normalizePerformance(90, 60)).toBeCloseTo(1.5)   // exactly at clip
  expect(normalizePerformance(120, 60)).toBeCloseTo(1.5)  // clipped from 2.0
  expect(normalizePerformance(0, 60)).toBeCloseTo(0.0)
})

test("computes sigmoid fatigue score with median threshold", () => {
  // at median threshold → score = 0.5
  expect(computeFatigueScore(MEDIAN_THRESHOLD)).toBeCloseTo(0.5)
  // above median → score > 0.5
  expect(computeFatigueScore(1.0)).toBeGreaterThan(0.5)
  // below median → score < 0.5
  expect(computeFatigueScore(0.0)).toBeLessThan(0.5)
  // always in [0, 1]
  expect(computeFatigueScore(2.0)).toBeGreaterThanOrEqual(0)
  expect(computeFatigueScore(2.0)).toBeLessThanOrEqual(1)
})

test("computes shared fatigue F_total with weight and age factors", () => {
  // reference body (age=30, weight=70): no scaling
  expect(computeFTotal(1.0, 1.0, { age: 30, weight: 70 })).toBeCloseTo(1.0)
  // heavier person: plank component increases → F_total > 1
  expect(computeFTotal(1.0, 1.0, { age: 30, weight: 140 })).toBeCloseTo(1.5)
  // older person: age_factor > 1 → F_total > 1
  expect(computeFTotal(1.0, 1.0, { age: 40, weight: 70 })).toBeCloseTo(1.1)
})

test("computes EWMA fatigue per exercise with alpha_P=0.35 and alpha_S=0.40", () => {
  expect(ALPHA_P).toBeCloseTo(0.35)
  expect(ALPHA_S).toBeCloseTo(0.40)
  expect(updateEWMA(ALPHA_P, 0, 1.0)).toBeCloseTo(0.35)
  expect(updateEWMA(ALPHA_S, 0, 1.0)).toBeCloseTo(0.40)
  expect(updateEWMA(ALPHA_P, 0.5, 1.0)).toBeCloseTo(0.675) // 0.35 + 0.65*0.5
})

test("computes ramp stress with clipped delta", () => {
  expect(computeRampStress(0.7, 1.0)).toBeCloseTo(0.3)   // exactly at clip max
  expect(computeRampStress(0.7, 1.2)).toBeCloseTo(0.3)   // clipped from 0.5
  expect(computeRampStress(1.0, 0.5)).toBeCloseTo(-0.3)  // clipped from -0.5
  expect(computeRampStress(0.8, 0.9)).toBeCloseTo(0.1)   // within range
})

test("computes load with over and under penalties", () => {
  expect(computeLoad(1.0)).toBeCloseTo(1.0)   // no penalty at exactly target
  expect(computeLoad(1.5)).toBeCloseTo(1.75)  // over: 1.5 + 0.5*0.5
  expect(computeLoad(0.5)).toBeCloseTo(0.6)   // under: 0.5 + 0.2*0.5
  expect(computeLoad(0.0)).toBeCloseTo(0.2)   // max under: 0 + 0.2*1
})

test("increases plank target when fatigue is low", () => {
  // 1 session at target → F_P = 0.35 → fatigue score ≈ 0.32 (low)
  const history: ExerciseRecord[] = [{ target_sec: 60, actual_sec: 60, success: true }]
  expect(computeNextTarget(60, history, params)).toBeGreaterThan(60)
})

test("decreases plank target by 10% after 3 consecutive failures", () => {
  const history: ExerciseRecord[] = [
    { target_sec: 60, actual_sec: 20, success: false },
    { target_sec: 60, actual_sec: 20, success: false },
    { target_sec: 60, actual_sec: 20, success: false },
  ]
  expect(computeNextTarget(60, history, params)).toBe(54)
})

test("plank target respects minimum floor", () => {
  // 3 failures → 60 * 0.9 = 54, but floor=59 → 59
  const history: ExerciseRecord[] = [
    { target_sec: 60, actual_sec: 20, success: false },
    { target_sec: 60, actual_sec: 20, success: false },
    { target_sec: 60, actual_sec: 20, success: false },
  ]
  expect(computeNextTarget(60, history, params, 59)).toBe(59)
})

test("plank target respects maximum ceiling", () => {
  // low fatigue → Math.round(60 * 1.05) = 63, but ceiling=61 → 61
  const history: ExerciseRecord[] = [{ target_sec: 60, actual_sec: 60, success: true }]
  expect(computeNextTarget(60, history, params, undefined, 61)).toBe(61)
})

test("holds plank target when fatigue score exceeds 0.85", () => {
  // 2 sessions at max overperformance (actual=90, target=60 → r_e=1.5 → load=1.75)
  // F_P after 2 ≈ 1.011 → fatigue score ≈ 0.93 > 0.85
  const history: ExerciseRecord[] = [
    { target_sec: 60, actual_sec: 90, success: true },
    { target_sec: 60, actual_sec: 90, success: true },
  ]
  expect(computeNextTarget(60, history, params)).toBe(60)
})
