export type ExerciseId = 'plank' | 'squat' | 'pushup' | 'deadhang' | 'dumbbell'

export interface ExerciseSettings {
  enabled: boolean
}

export interface AppSettings {
  exercises: Record<ExerciseId, ExerciseSettings>
  countdownSec: number
}

const STORAGE_KEY = 'app-settings'

const ALL_EXERCISES = ['plank', 'squat', 'pushup', 'deadhang', 'dumbbell'] as const satisfies readonly ExerciseId[]

function defaultSettings(): AppSettings {
  return {
    exercises: {
      plank: { enabled: true },
      squat: { enabled: true },
      pushup: { enabled: true },
      deadhang: { enabled: true },
      dumbbell: { enabled: true },
    },
    countdownSec: 5,
  }
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSettings(value: unknown): AppSettings {
  const defaults = defaultSettings()
  if (!isRecord(value)) return defaults

  const exercises = value.exercises
  if (isRecord(exercises)) {
    for (const id of ALL_EXERCISES) {
      const entry = exercises[id]
      if (isRecord(entry) && typeof entry.enabled === 'boolean') {
        defaults.exercises[id] = { enabled: entry.enabled }
      }
    }
  }

  if (typeof value.countdownSec === 'number' && Number.isFinite(value.countdownSec)) {
    defaults.countdownSec = Math.max(0, Math.min(10, Math.floor(value.countdownSec)))
  }

  return defaults
}

export function loadSettings(): AppSettings {
  if (!hasLocalStorage()) return defaultSettings()

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultSettings()

  try {
    return parseSettings(JSON.parse(raw))
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: AppSettings): boolean {
  if (!hasLocalStorage()) return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
