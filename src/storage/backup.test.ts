import { beforeEach, expect, test } from 'bun:test'
import {
  applyRestore,
  BACKUP_SCHEMA_VERSION,
  backupFileName,
  createBackup,
  exportBackup,
  parseBackup,
  PRE_RESTORE_BACKUP_KEY,
  previewRestore,
  serializeBackup,
} from './backup'
import { loadAllRecords, saveRecord } from './daily-record'
import { loadSettings, saveSettings, type AppSettings } from './settings'
import type { DailyRecord } from '../types'
import { addDaysToDateKey } from '../utils/date-key'

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

function sampleRecord(date: string, seed = 0): DailyRecord {
  return {
    date,
    plank: {
      target_sec: 60 + seed,
      actual_sec: 55 + seed,
      success: seed % 2 === 0,
      ...(seed % 4 === 0 ? { inactive_time_ratio: 0.25, cancelled: seed % 8 === 0 } : {}),
    },
    squat: { target_reps: 20 + seed, actual_reps: 20 + seed, success: true },
    pushup: { target_reps: 15, actual_reps: 12 + (seed % 4), success: false },
    deadhang: { target_sec: 30, actual_sec: 30, success: true },
    dumbbell: seed % 3 === 0 ? null : { target_reps: 10, actual_reps: 10, success: true },
    fatigue: (seed % 10) / 10,
    F_P: 0.3,
    F_S: 0.2,
    F_U: 0.1,
    F_D: 0.05,
    F_DB: 0.05,
    F_total_raw: 0.5 + seed,
    inactive_time_ratio: 0.1,
    flag_suspicious: seed % 7 === 0,
    squat_completed: true,
    pushup_completed: seed % 2 === 1,
    dumbbell_completed: false,
    ...(seed % 5 === 0 ? { day_type: 'recovery' as const } : {}),
  }
}

function sampleSettings(): AppSettings {
  return {
    exercises: {
      plank: { enabled: true },
      squat: { enabled: false },
      pushup: { enabled: true },
      deadhang: { enabled: false },
      dumbbell: { enabled: true },
    },
    countdownSec: 3,
  }
}

function seedThirtyDays(): DailyRecord[] {
  const records = Array.from({ length: 30 }, (_, i) => sampleRecord(addDaysToDateKey('2026-09-01', i), i))
  for (const record of records) saveRecord(record)
  saveSettings(sampleSettings())
  return records
}

function snapshotStorage(): Record<string, string | null> {
  return {
    'daily-records': localStorage.getItem('daily-records'),
    'app-settings': localStorage.getItem('app-settings'),
    [PRE_RESTORE_BACKUP_KEY]: localStorage.getItem(PRE_RESTORE_BACKUP_KEY),
  }
}

function parseOk(text: string) {
  const result = parseBackup(text)
  if (!result.ok) throw new Error(`expected valid backup, got: ${result.error}`)
  return result.backup
}

beforeEach(() => {
  ;(globalThis as { localStorage: Storage }).localStorage = createMemoryStorage()
})

test('export → restore into empty storage → identical to original (30 days + settings)', () => {
  const original = seedThirtyDays()
  const text = serializeBackup(createBackup(new Date('2026-10-01T00:00:00Z')))

  ;(globalThis as { localStorage: Storage }).localStorage = createMemoryStorage()
  const backup = parseOk(text)
  applyRestore(backup, { conflicts: {}, includeSettings: true })

  expect(loadAllRecords()).toEqual(original)
  expect(loadSettings()).toEqual(sampleSettings())
})

test('backup file carries schema_version and exported_at', () => {
  seedThirtyDays()
  const json = JSON.parse(serializeBackup(createBackup(new Date('2026-10-01T00:00:00Z'))))

  expect(json.schema_version).toBe(BACKUP_SCHEMA_VERSION)
  expect(json.app).toBe('daily-plank-squat')
  expect(json.exported_at).toBe('2026-10-01T00:00:00.000Z')
  expect(json.records).toHaveLength(30)
})

test('preview lists same-date conflicts and new dates', () => {
  saveRecord(sampleRecord('2026-09-01', 1))
  saveRecord(sampleRecord('2026-09-02', 2))

  const backup = parseOk(serializeBackup({
    ...createBackup(),
    records: [sampleRecord('2026-09-01', 9), sampleRecord('2026-09-02', 2), sampleRecord('2026-09-03', 3)],
  }))
  const preview = previewRestore(backup)

  expect(preview.newDates).toEqual(['2026-09-03'])
  expect(preview.conflicts.map((c) => c.date)).toEqual(['2026-09-01'])
  expect(preview.identicalDates).toEqual(['2026-09-02'])
})

test('apply honors per-date conflict choices', () => {
  const existingA = sampleRecord('2026-09-01', 1)
  const existingB = sampleRecord('2026-09-02', 2)
  saveRecord(existingA)
  saveRecord(existingB)

  const incomingA = sampleRecord('2026-09-01', 11)
  const incomingB = sampleRecord('2026-09-02', 12)
  const backup = parseOk(serializeBackup({ ...createBackup(), records: [incomingA, incomingB] }))

  applyRestore(backup, { conflicts: { '2026-09-01': 'replace', '2026-09-02': 'keep' }, includeSettings: false })

  expect(loadAllRecords()).toEqual([incomingA, existingB])
})

test('unresolved conflicts default to keeping existing records', () => {
  const existing = sampleRecord('2026-09-01', 1)
  saveRecord(existing)
  const backup = parseOk(serializeBackup({ ...createBackup(), records: [sampleRecord('2026-09-01', 5)] }))

  applyRestore(backup, { conflicts: {}, includeSettings: false })

  expect(loadAllRecords()).toEqual([existing])
})

test('restoring the same file twice keeps records intact without duplicates', () => {
  const original = seedThirtyDays()
  const backup = parseOk(serializeBackup(createBackup()))

  applyRestore(backup, { conflicts: {}, includeSettings: true })
  applyRestore(backup, { conflicts: {}, includeSettings: true })

  expect(loadAllRecords()).toEqual(original)
  expect(previewRestore(backup).conflicts).toEqual([])
  expect(previewRestore(backup).newDates).toEqual([])
})

test('apply snapshots existing raw data to the pre-restore key first', () => {
  seedThirtyDays()
  const beforeRecords = localStorage.getItem('daily-records')
  const beforeSettings = localStorage.getItem('app-settings')
  const backup = parseOk(serializeBackup({ ...createBackup(), records: [sampleRecord('2027-01-01', 1)] }))

  applyRestore(backup, { conflicts: {}, includeSettings: true }, new Date('2026-10-02T00:00:00Z'))

  const snapshot = JSON.parse(localStorage.getItem(PRE_RESTORE_BACKUP_KEY) ?? 'null')
  expect(snapshot.saved_at).toBe('2026-10-02T00:00:00.000Z')
  expect(snapshot['daily-records']).toBe(beforeRecords)
  expect(snapshot['app-settings']).toBe(beforeSettings)
})

test('apply rolls back when a storage write fails', () => {
  seedThirtyDays()
  const before = snapshotStorage()
  const backup = parseOk(serializeBackup({ ...createBackup(), records: [sampleRecord('2027-01-01', 1)] }))

  const storage = localStorage
  const realSetItem = storage.setItem.bind(storage)
  storage.setItem = (key: string, value: string) => {
    if (key === 'app-settings') throw new Error('QuotaExceededError')
    realSetItem(key, value)
  }

  expect(() => applyRestore(backup, { conflicts: {}, includeSettings: true })).toThrow()
  storage.setItem = realSetItem

  expect(localStorage.getItem('daily-records')).toBe(before['daily-records'])
  expect(localStorage.getItem('app-settings')).toBe(before['app-settings'])
})

test('export skips stored records that would fail import, so every export restores', () => {
  const valid = sampleRecord('2026-09-01', 1)
  localStorage.setItem('daily-records', JSON.stringify([
    valid,
    { ...sampleRecord('2026-09-02', 2), date: '2026-9-2' },
    { ...sampleRecord('2026-09-03', 3), fatigue: 1.2 },
  ]))

  const { backup, skippedDates } = exportBackup()

  expect(skippedDates).toEqual(['2026-09-03', '2026-9-2'])
  expect(parseOk(serializeBackup(backup)).records).toEqual([valid])
})

test('backup file name uses the local export date', () => {
  const exportedAt = new Date(2026, 9, 17, 0, 30)
  expect(backupFileName(createBackup(exportedAt))).toBe('daily-plank-squat-backup-2026-10-17.json')
})

const validEnvelope = () => JSON.parse(serializeBackup({
  ...createBackup(),
  records: [sampleRecord('2026-09-01', 1)],
  settings: sampleSettings(),
}))

const invalidCases: Array<[string, () => string]> = [
  ['non-JSON text', () => '{not json'],
  ['JSON array', () => '[]'],
  ['missing schema_version', () => JSON.stringify({ ...validEnvelope(), schema_version: undefined })],
  ['future schema_version', () => JSON.stringify({ ...validEnvelope(), schema_version: 999 })],
  ['unparseable exported_at', () => JSON.stringify({ ...validEnvelope(), exported_at: 'yesterday' })],
  ['wrong app id', () => JSON.stringify({ ...validEnvelope(), app: 'other-app' })],
  ['records not an array', () => JSON.stringify({ ...validEnvelope(), records: {} })],
  ['malformed date', () => JSON.stringify({ ...validEnvelope(), records: [{ ...sampleRecord('2026-9-1'), date: '2026-9-1' }] })],
  ['impossible date', () => JSON.stringify({ ...validEnvelope(), records: [sampleRecord('2026-02-30')] })],
  ['duplicate dates', () => JSON.stringify({ ...validEnvelope(), records: [sampleRecord('2026-09-01'), sampleRecord('2026-09-01')] })],
  ['negative reps', () => JSON.stringify({
    ...validEnvelope(),
    records: [{ ...sampleRecord('2026-09-01'), squat: { target_reps: 20, actual_reps: -1, success: true } }],
  })],
  ['fatigue above 1', () => JSON.stringify({ ...validEnvelope(), records: [{ ...sampleRecord('2026-09-01'), fatigue: 1.5 }] })],
  ['plank inactive ratio above 1', () => JSON.stringify({
    ...validEnvelope(),
    records: [{ ...sampleRecord('2026-09-01'), plank: { target_sec: 60, actual_sec: 60, success: true, inactive_time_ratio: 1.5 } }],
  })],
  ['non-boolean plank cancelled', () => JSON.stringify({
    ...validEnvelope(),
    records: [{ ...sampleRecord('2026-09-01'), plank: { target_sec: 60, actual_sec: 60, success: true, cancelled: 'no' } }],
  })],
  ['missing plank', () => JSON.stringify({ ...validEnvelope(), records: [{ ...sampleRecord('2026-09-01'), plank: undefined }] })],
  ['unknown day_type', () => JSON.stringify({ ...validEnvelope(), records: [{ ...sampleRecord('2026-09-01'), day_type: 'rest' }] })],
  ['countdown out of range', () => JSON.stringify({ ...validEnvelope(), settings: { ...sampleSettings(), countdownSec: 60 } })],
  ['settings missing an exercise', () => JSON.stringify({
    ...validEnvelope(),
    settings: { countdownSec: 5, exercises: { plank: { enabled: true } } },
  })],
]

for (const [label, makeText] of invalidCases) {
  test(`rejects corrupt backup (${label}) and leaves storage unchanged`, () => {
    seedThirtyDays()
    const before = snapshotStorage()

    const result = parseBackup(makeText())

    expect(result.ok).toBe(false)
    expect(snapshotStorage()).toEqual(before)
  })
}

for (const exercise of ['plank', 'deadhang'] as const) {
  for (const success of [true, false]) {
    test(`restore compares legacy ${exercise} defaults symmetrically (success=${success})`, () => {
      const legacy = sampleRecord('2026-09-01', 1)
      legacy[exercise].success = success
      const explicit = structuredClone(legacy)
      explicit[exercise].inactive_time_ratio = legacy.inactive_time_ratio
      explicit[exercise].cancelled = !success
      for (const [existing, incoming] of [[legacy, explicit], [explicit, legacy]]) {
        saveRecord(existing)
        const backup = parseOk(serializeBackup({ ...createBackup(), records: [incoming] }))
        expect(previewRestore(backup).identicalDates).toEqual([legacy.date])
        expect(previewRestore(backup).conflicts).toEqual([])
        applyRestore(backup, { conflicts: {}, includeSettings: false })
        expect(loadAllRecords()).toEqual([existing])
      }
    })
  }

  test(`restore still detects meaningful ${exercise} metadata differences`, () => {
    const legacy = sampleRecord('2026-09-01', 1)
    saveRecord(legacy)
    for (const metadata of [{ inactive_time_ratio: 0 }, { cancelled: legacy[exercise].success }]) {
      const incoming = structuredClone(legacy)
      Object.assign(incoming[exercise], metadata)
      const backup = parseOk(serializeBackup({ ...createBackup(), records: [incoming] }))
      expect(previewRestore(backup).conflicts.map((conflict) => conflict.date)).toEqual([legacy.date])
    }
  })
}

for (const exercise of ['plank', 'deadhang'] as const) {
  test(`restore normalizes skipped legacy ${exercise} to writer defaults`, () => {
    const legacy = sampleRecord('2026-09-01', 1)
    legacy[exercise] = { target_sec: 60, actual_sec: 0, success: false }
    const explicit = structuredClone(legacy)
    explicit[exercise].inactive_time_ratio = 0
    explicit[exercise].cancelled = false
    for (const [existing, incoming] of [[legacy, explicit], [explicit, legacy]]) {
      saveRecord(existing)
      const backup = parseOk(serializeBackup({ ...createBackup(), records: [incoming] }))
      expect(previewRestore(backup).identicalDates).toEqual([legacy.date])
    }
  })
}
