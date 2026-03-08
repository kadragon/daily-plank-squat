export type ExerciseId = 'plank' | 'squat' | 'pushup' | 'deadhang' | 'dumbbell'

export interface ExerciseSettings {
  enabled: boolean
}

export interface AppSettings {
  exercises: Record<ExerciseId, ExerciseSettings>
}

const STORAGE_KEY = 'app-settings'

const ALL_EXERCISES: readonly ExerciseId[] = ['plank', 'squat', 'pushup', 'deadhang', 'dumbbell']

function defaultSettings(): AppSettings {
  return {
    exercises: {
      plank: { enabled: true },
      squat: { enabled: true },
      pushup: { enabled: true },
      deadhang: { enabled: true },
      dumbbell: { enabled: true },
    },
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
  if (!isRecord(exercises)) return defaults

  for (const id of ALL_EXERCISES) {
    const entry = exercises[id]
    if (isRecord(entry) && typeof entry.enabled === 'boolean') {
      defaults.exercises[id] = { enabled: entry.enabled }
    }
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

export function saveSettings(settings: AppSettings): void {
  if (!hasLocalStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
