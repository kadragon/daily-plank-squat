import { afterEach, beforeEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Window } from 'happy-dom'
import BackupRestore from './backup-restore'
import { loadAllRecords, saveRecord } from '../storage/daily-record'
import type { DailyRecord } from '../types'

const happyWindow = new Window({ url: 'https://localhost/' })
happyWindow.SyntaxError = SyntaxError

if (typeof document === 'undefined') {
  Object.assign(globalThis, {
    window: happyWindow,
    document: happyWindow.document,
    navigator: happyWindow.navigator,
    localStorage: happyWindow.localStorage,
    Element: happyWindow.Element,
    HTMLElement: happyWindow.HTMLElement,
    Node: happyWindow.Node,
    Event: happyWindow.Event,
  })
}

// Other test files swap the global localStorage; start each test from an empty store.
beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function sampleRecord(date: string, plankSec: number): DailyRecord {
  return {
    date,
    plank: { target_sec: 60, actual_sec: plankSec, success: true },
    squat: { target_reps: 20, actual_reps: 20, success: true },
    pushup: { target_reps: 15, actual_reps: 15, success: true },
    deadhang: { target_sec: 30, actual_sec: 30, success: true },
    dumbbell: null,
    fatigue: 0.4,
    F_P: 0.3,
    F_S: 0.2,
    F_U: 0.1,
    F_D: 0.05,
    F_DB: 0.05,
    F_total_raw: 0.5,
    inactive_time_ratio: 0,
    flag_suspicious: false,
    squat_completed: false,
    pushup_completed: false,
    dumbbell_completed: false,
  }
}

// Export from the component itself so the restore path exercises a real file.
function exportBackupText(): string {
  let exported = ''
  const view = render(<BackupRestore onRestored={() => {}} downloadFile={(_, contents) => { exported = contents }} />)
  fireEvent.click(view.getByText('Export backup'))
  view.unmount()
  return exported
}

function chooseFile(input: HTMLElement, text: string) {
  const file = new happyWindow.File([text], 'backup.json', { type: 'application/json' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

test('export downloads a JSON file name with the export date', () => {
  saveRecord(sampleRecord('2026-09-01', 60))
  let fileName = ''
  const view = render(<BackupRestore onRestored={() => {}} downloadFile={(name) => { fileName = name }} />)

  fireEvent.click(view.getByText('Export backup'))

  expect(fileName).toMatch(/^daily-plank-squat-backup-\d{4}-\d{2}-\d{2}\.json$/)
  expect(view.getByRole('status').textContent).toContain('Exported 1 records')
})

test('restore previews conflicts and applies the chosen record on confirm', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  saveRecord(sampleRecord('2026-09-02', 45))
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 10))

  let restored = 0
  const view = render(<BackupRestore onRestored={() => { restored += 1 }} />)
  chooseFile(view.getByLabelText('Backup file'), text)

  const preview = await waitFor(() => view.getByRole('region', { name: 'Restore preview' }))
  expect(preview.textContent).toContain('0 new, 1 unchanged, 1 conflicting days')
  expect(preview.textContent).toContain('2026-09-01')

  fireEvent.click(view.getByLabelText(/Use backup/))
  fireEvent.click(view.getByText('Apply restore'))

  expect(restored).toBe(1)
  expect(loadAllRecords().map((r) => r.plank.actual_sec)).toEqual([90, 45])
})

test('cancel leaves storage untouched', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 10))
  const before = localStorage.getItem('daily-records')

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('Backup file'), text)
  await waitFor(() => view.getByRole('region', { name: 'Restore preview' }))
  fireEvent.click(view.getByLabelText(/Use backup/))
  fireEvent.click(view.getByText('Cancel'))

  expect(view.queryByRole('region', { name: 'Restore preview' })).toBeNull()
  expect(localStorage.getItem('daily-records')).toBe(before)
  expect(localStorage.getItem('pre-restore-backup')).toBeNull()
})

test('invalid file shows an error and changes nothing', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  const before = localStorage.getItem('daily-records')

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('Backup file'), '{"app":"daily-plank-squat","schema_version":1,"records":"oops"}')

  await waitFor(() => expect(view.getByRole('status').textContent).toContain('Invalid backup file'))
  expect(view.queryByRole('region', { name: 'Restore preview' })).toBeNull()
  expect(localStorage.getItem('daily-records')).toBe(before)
})
