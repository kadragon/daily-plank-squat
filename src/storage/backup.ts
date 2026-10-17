import type { DailyRecord, DayType, DumbbellRecord, ExerciseRecord, SquatRecord } from '../types'
import { DAILY_RECORDS_STORAGE_KEY, loadAllRecords } from './daily-record'
import { ALL_EXERCISES, loadSettings, SETTINGS_STORAGE_KEY, type AppSettings, type ExerciseId } from './settings'

export const BACKUP_SCHEMA_VERSION = 1
export const BACKUP_APP_ID = 'daily-plank-squat'
export const PRE_RESTORE_BACKUP_KEY = 'pre-restore-backup'

export interface BackupFile {
  schema_version: typeof BACKUP_SCHEMA_VERSION
  app: typeof BACKUP_APP_ID
  exported_at: string
  records: DailyRecord[]
  settings: AppSettings
}

export type ParseBackupResult = { ok: true, backup: BackupFile } | { ok: false, error: string }

export interface RestoreConflict {
  date: string
  existing: DailyRecord
  incoming: DailyRecord
}

export interface RestorePreview {
  newDates: string[]
  identicalDates: string[]
  conflicts: RestoreConflict[]
  settingsChanged: boolean
}

export type ConflictChoice = 'keep' | 'replace'

export interface RestoreOptions {
  // Dates missing from this map keep the existing record.
  conflicts: Record<string, ConflictChoice>
  includeSettings: boolean
}

class BackupValidationError extends Error {}

function fail(message: string): never {
  throw new BackupValidationError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCount(value: unknown, path: string, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    fail(`${path} must be a number between 0 and ${max}`)
  }
  return value
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(`${path} must be a boolean`)
  return value
}

function readObject(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${path} must be an object`)
  return value
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function readSecondsRecord(value: unknown, path: string): ExerciseRecord {
  const obj = readObject(value, path)
  return {
    target_sec: readCount(obj.target_sec, `${path}.target_sec`),
    actual_sec: readCount(obj.actual_sec, `${path}.actual_sec`),
    success: readBoolean(obj.success, `${path}.success`),
  }
}

function readRepsRecord(value: unknown, path: string): SquatRecord {
  const obj = readObject(value, path)
  return {
    target_reps: readCount(obj.target_reps, `${path}.target_reps`),
    actual_reps: readCount(obj.actual_reps, `${path}.actual_reps`),
    success: readBoolean(obj.success, `${path}.success`),
  }
}

function readDailyRecord(value: unknown, path: string): DailyRecord {
  const obj = readObject(value, path)
  if (typeof obj.date !== 'string' || !isValidDateKey(obj.date)) fail(`${path}.date must be a valid YYYY-MM-DD date`)

  let day_type: DayType | undefined
  if (obj.day_type !== undefined) {
    if (obj.day_type !== 'training' && obj.day_type !== 'recovery') fail(`${path}.day_type is not recognized`)
    day_type = obj.day_type
  }

  const dumbbell: DumbbellRecord | null = obj.dumbbell === null
    ? null
    : readRepsRecord(obj.dumbbell, `${path}.dumbbell`)

  // Key order mirrors daily-record.ts so serialized records compare byte-for-byte.
  return {
    date: obj.date,
    plank: readSecondsRecord(obj.plank, `${path}.plank`),
    squat: readRepsRecord(obj.squat, `${path}.squat`),
    pushup: readRepsRecord(obj.pushup, `${path}.pushup`),
    deadhang: readSecondsRecord(obj.deadhang, `${path}.deadhang`),
    dumbbell,
    fatigue: readCount(obj.fatigue, `${path}.fatigue`, 1),
    F_P: readCount(obj.F_P, `${path}.F_P`),
    F_S: readCount(obj.F_S, `${path}.F_S`),
    F_U: readCount(obj.F_U, `${path}.F_U`),
    F_D: readCount(obj.F_D, `${path}.F_D`),
    F_DB: readCount(obj.F_DB, `${path}.F_DB`),
    F_total_raw: readCount(obj.F_total_raw, `${path}.F_total_raw`),
    inactive_time_ratio: readCount(obj.inactive_time_ratio, `${path}.inactive_time_ratio`, 1),
    flag_suspicious: readBoolean(obj.flag_suspicious, `${path}.flag_suspicious`),
    squat_completed: readBoolean(obj.squat_completed, `${path}.squat_completed`),
    pushup_completed: readBoolean(obj.pushup_completed, `${path}.pushup_completed`),
    dumbbell_completed: readBoolean(obj.dumbbell_completed, `${path}.dumbbell_completed`),
    day_type,
  }
}

function readSettings(value: unknown): AppSettings {
  const obj = readObject(value, 'settings')
  const exercisesRaw = readObject(obj.exercises, 'settings.exercises')
  const exercises = {} as Record<ExerciseId, { enabled: boolean }>
  for (const id of ALL_EXERCISES) {
    const entry = readObject(exercisesRaw[id], `settings.exercises.${id}`)
    exercises[id] = { enabled: readBoolean(entry.enabled, `settings.exercises.${id}.enabled`) }
  }
  const countdownSec = readCount(obj.countdownSec, 'settings.countdownSec', 10)
  if (!Number.isInteger(countdownSec)) fail('settings.countdownSec must be an integer')
  return { exercises, countdownSec }
}

function readBackup(value: unknown): BackupFile {
  const obj = readObject(value, 'backup')
  if (obj.app !== BACKUP_APP_ID) fail('not a daily-plank-squat backup file')
  if (obj.schema_version !== BACKUP_SCHEMA_VERSION) fail(`unsupported schema_version: ${String(obj.schema_version)}`)
  if (typeof obj.exported_at !== 'string') fail('exported_at must be a string')
  if (!Array.isArray(obj.records)) fail('records must be an array')

  const seen = new Set<string>()
  const records = obj.records.map((item, index) => {
    const record = readDailyRecord(item, `records[${index}]`)
    if (seen.has(record.date)) fail(`records contain duplicate date ${record.date}`)
    seen.add(record.date)
    return record
  })

  return {
    schema_version: BACKUP_SCHEMA_VERSION,
    app: BACKUP_APP_ID,
    exported_at: obj.exported_at,
    records: records.toSorted((a, b) => a.date.localeCompare(b.date)),
    settings: readSettings(obj.settings),
  }
}

function canonicalRecord(record: DailyRecord): string {
  try {
    return JSON.stringify(readDailyRecord(record, 'record'))
  } catch {
    // Legacy stored records may predate strict validation; compare them as-is.
    return JSON.stringify(record)
  }
}

export function createBackup(now = new Date()): BackupFile {
  return {
    schema_version: BACKUP_SCHEMA_VERSION,
    app: BACKUP_APP_ID,
    exported_at: now.toISOString(),
    records: loadAllRecords(),
    settings: loadSettings(),
  }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export function backupFileName(backup: BackupFile): string {
  return `daily-plank-squat-backup-${backup.exported_at.slice(0, 10)}.json`
}

export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'file is not valid JSON' }
  }
  try {
    return { ok: true, backup: readBackup(raw) }
  } catch (err) {
    if (err instanceof BackupValidationError) return { ok: false, error: err.message }
    throw err
  }
}

export function previewRestore(backup: BackupFile): RestorePreview {
  const existingByDate = new Map(loadAllRecords().map((record) => [record.date, record]))
  const preview: RestorePreview = {
    newDates: [],
    identicalDates: [],
    conflicts: [],
    settingsChanged: JSON.stringify(loadSettings()) !== JSON.stringify(backup.settings),
  }

  for (const incoming of backup.records) {
    const existing = existingByDate.get(incoming.date)
    if (!existing) {
      preview.newDates.push(incoming.date)
    } else if (canonicalRecord(existing) === canonicalRecord(incoming)) {
      preview.identicalDates.push(incoming.date)
    } else {
      preview.conflicts.push({ date: incoming.date, existing, incoming })
    }
  }

  return preview
}

export function applyRestore(backup: BackupFile, options: RestoreOptions, now = new Date()): void {
  const previousRecords = localStorage.getItem(DAILY_RECORDS_STORAGE_KEY)
  const previousSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)

  localStorage.setItem(PRE_RESTORE_BACKUP_KEY, JSON.stringify({
    saved_at: now.toISOString(),
    [DAILY_RECORDS_STORAGE_KEY]: previousRecords,
    [SETTINGS_STORAGE_KEY]: previousSettings,
  }))

  const merged = new Map(loadAllRecords().map((record) => [record.date, record]))
  for (const incoming of backup.records) {
    if (!merged.has(incoming.date) || options.conflicts[incoming.date] === 'replace') {
      merged.set(incoming.date, incoming)
    }
  }
  const records = [...merged.values()].toSorted((a, b) => a.date.localeCompare(b.date))

  try {
    localStorage.setItem(DAILY_RECORDS_STORAGE_KEY, JSON.stringify(records))
    if (options.includeSettings) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(backup.settings))
    }
  } catch (err) {
    restoreRaw(DAILY_RECORDS_STORAGE_KEY, previousRecords)
    restoreRaw(SETTINGS_STORAGE_KEY, previousSettings)
    throw err
  }
}

function restoreRaw(key: string, value: string | null): void {
  if (value === null) localStorage.removeItem(key)
  else localStorage.setItem(key, value)
}
