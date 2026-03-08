import { beforeEach, expect, test } from 'bun:test'
import { loadSettings, saveSettings, type AppSettings } from './settings'

function createMemoryStorage(): Storage {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.get(key) ?? null
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
  }
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = createMemoryStorage()
})

test('loadSettings returns all exercises enabled by default', () => {
  const settings = loadSettings()

  expect(settings.exercises.plank.enabled).toBe(true)
  expect(settings.exercises.squat.enabled).toBe(true)
  expect(settings.exercises.pushup.enabled).toBe(true)
  expect(settings.exercises.deadhang.enabled).toBe(true)
  expect(settings.exercises.dumbbell.enabled).toBe(true)
})

test('saveSettings persists and loadSettings reads back', () => {
  const settings: AppSettings = {
    exercises: {
      plank: { enabled: true },
      squat: { enabled: false },
      pushup: { enabled: true },
      deadhang: { enabled: false },
      dumbbell: { enabled: true },
    },
  }

  saveSettings(settings)
  const loaded = loadSettings()

  expect(loaded.exercises.squat.enabled).toBe(false)
  expect(loaded.exercises.deadhang.enabled).toBe(false)
  expect(loaded.exercises.dumbbell.enabled).toBe(true)
})

test('loadSettings handles corrupted JSON gracefully', () => {
  localStorage.setItem('app-settings', '{bad-json')

  const settings = loadSettings()
  expect(settings.exercises.plank.enabled).toBe(true)
})

test('loadSettings handles missing exercises gracefully', () => {
  localStorage.setItem('app-settings', JSON.stringify({ exercises: { plank: { enabled: false } } }))

  const settings = loadSettings()
  expect(settings.exercises.plank.enabled).toBe(false)
  expect(settings.exercises.squat.enabled).toBe(true)
})
