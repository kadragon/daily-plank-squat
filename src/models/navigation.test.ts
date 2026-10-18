import { expect, test } from 'bun:test'
import type { AppSettings } from '../storage/settings'
import { TAB_ITEMS, getActiveTab, getEnabledExerciseViews, isWorkoutView, resolveView } from './navigation'

function settingsWith(disabled: (keyof AppSettings['exercises'])[] = []): AppSettings {
  const exercises = {
    plank: { enabled: true },
    squat: { enabled: true },
    pushup: { enabled: true },
    deadhang: { enabled: true },
    dumbbell: { enabled: true },
  }
  for (const id of disabled) exercises[id] = { enabled: false }
  return { exercises, countdownSec: 5 }
}

test('TAB_ITEMS is fixed to today, history, settings', () => {
  expect(TAB_ITEMS.map((item) => item.tab)).toEqual(['today', 'history', 'settings'])
  expect(TAB_ITEMS.map((item) => item.label)).toEqual(['오늘 운동', '기록', '설정'])
})

test('getEnabledExerciseViews keeps exercise order and drops disabled ones', () => {
  expect(getEnabledExerciseViews(settingsWith())).toEqual(['plank', 'squat', 'pushup', 'deadhang', 'dumbbell'])
  expect(getEnabledExerciseViews(settingsWith(['squat', 'dumbbell']))).toEqual(['plank', 'pushup', 'deadhang'])
})

test('getActiveTab maps exercise detail views to today', () => {
  expect(getActiveTab('plank')).toBe('today')
  expect(getActiveTab('dumbbell')).toBe('today')
  expect(getActiveTab('history')).toBe('history')
  expect(getActiveTab('settings')).toBe('settings')
})

test('isWorkoutView is true only for exercise views', () => {
  expect(isWorkoutView('squat')).toBe(true)
  expect(isWorkoutView('today')).toBe(false)
  expect(isWorkoutView('history')).toBe(false)
})

test('resolveView sends a disabled exercise detail back to today and keeps everything else', () => {
  const settings = settingsWith(['pushup'])

  expect(resolveView('pushup', settings)).toBe('today')
  expect(resolveView('squat', settings)).toBe('squat')
  expect(resolveView('history', settings)).toBe('history')
  expect(resolveView('settings', settings)).toBe('settings')
})
