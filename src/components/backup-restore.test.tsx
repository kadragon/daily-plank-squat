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
  fireEvent.click(view.getByText('백업 내보내기'))
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

  fireEvent.click(view.getByText('백업 내보내기'))

  expect(fileName).toMatch(/^daily-plank-squat-backup-\d{4}-\d{2}-\d{2}\.json$/)
  expect(view.getByRole('status').textContent).toContain('기록 1개를 내보냈습니다')
})

test('restore previews conflicts and applies the chosen record on confirm', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  saveRecord(sampleRecord('2026-09-02', 45))
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 10))

  let restored = 0
  const view = render(<BackupRestore onRestored={() => { restored += 1 }} />)
  chooseFile(view.getByLabelText('백업 파일'), text)

  const preview = await waitFor(() => view.getByRole('region', { name: '복원 미리보기' }))
  expect(preview.textContent).toContain('새 기록 0일, 동일 1일, 충돌 1일')
  expect(preview.textContent).toContain('2026-09-01')

  fireEvent.click(view.getByLabelText(/백업 기록 사용/))
  fireEvent.click(view.getByText('복원 적용'))

  expect(restored).toBe(1)
  expect(loadAllRecords().map((r) => r.plank.actual_sec)).toEqual([90, 45])
})

test('cancel leaves storage untouched', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 10))
  const before = localStorage.getItem('daily-records')

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('백업 파일'), text)
  await waitFor(() => view.getByRole('region', { name: '복원 미리보기' }))
  fireEvent.click(view.getByLabelText(/백업 기록 사용/))
  fireEvent.click(view.getByText('취소'))

  expect(view.queryByRole('region', { name: '복원 미리보기' })).toBeNull()
  expect(localStorage.getItem('daily-records')).toBe(before)
  expect(localStorage.getItem('pre-restore-backup')).toBeNull()
})

test('invalid file shows an error and changes nothing', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  const before = localStorage.getItem('daily-records')

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('백업 파일'), '{"app":"daily-plank-squat","schema_version":1,"records":"oops"}')

  await waitFor(() => expect(view.getByRole('status').textContent).toContain('잘못된 백업 파일입니다'))
  expect(view.queryByRole('region', { name: '복원 미리보기' })).toBeNull()
  expect(localStorage.getItem('daily-records')).toBe(before)
})

function chooseFakeFile(input: HTMLElement, text: () => Promise<string>) {
  Object.defineProperty(input, 'files', { value: [{ text }], configurable: true })
  fireEvent.change(input)
}

test('stale read is ignored and the preview is withdrawn while reading', async () => {
  saveRecord(sampleRecord('2026-09-01', 90))
  const firstText = exportBackupText()
  saveRecord(sampleRecord('2026-09-02', 45))
  const secondText = exportBackupText()
  localStorage.clear()

  let resolveFirst: (text: string) => void = () => {}
  let resolveSecond: (text: string) => void = () => {}
  const view = render(<BackupRestore onRestored={() => {}} />)
  const input = view.getByLabelText('백업 파일')

  chooseFile(input, firstText)
  const firstPreview = await waitFor(() => view.getByRole('region', { name: '복원 미리보기' }))
  expect(firstPreview.textContent).toContain('새 기록 1일')

  chooseFakeFile(input, () => new Promise((resolve) => { resolveFirst = resolve }))
  chooseFakeFile(input, () => new Promise((resolve) => { resolveSecond = resolve }))
  // The earlier preview is withdrawn while reading, so it cannot be applied meanwhile.
  expect(view.queryByRole('region', { name: '복원 미리보기' })).toBeNull()
  expect(view.getByRole('status').textContent).toBe('파일을 읽는 중…')

  resolveSecond(secondText)
  await waitFor(() => expect(view.getByRole('region', { name: '복원 미리보기' }).textContent).toContain('새 기록 2일'))
  resolveFirst(firstText)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(view.getByRole('region', { name: '복원 미리보기' }).textContent).toContain('새 기록 2일')
  expect(view.queryByRole('status')).toBeNull()
})

test('unreadable file shows an error', async () => {
  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFakeFile(view.getByLabelText('백업 파일'), () => Promise.reject(new Error('NotReadableError')))

  await waitFor(() => expect(view.getByRole('status').textContent).toContain('파일을 읽지 못했습니다 — 변경된 내용이 없습니다.'))
  expect(view.queryByRole('region', { name: '복원 미리보기' })).toBeNull()
})

test('conflict labels show the fields that differ', async () => {
  saveRecord({ ...sampleRecord('2026-09-01', 60), deadhang: { target_sec: 30, actual_sec: 40, success: true }, squat_completed: true })
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 60))

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('백업 파일'), text)
  await waitFor(() => view.getByRole('region', { name: '복원 미리보기' }))

  expect(view.getByLabelText(/현재 기록 유지/).parentElement?.textContent).toBe('현재 기록 유지 — 데드행 30초 · 스쿼트 완료: 아니오')
  expect(view.getByLabelText(/백업 기록 사용/).parentElement?.textContent).toBe('백업 기록 사용 — 데드행 40초 · 스쿼트 완료: 예')
})

test('conflict labels fall back to the main summary when only derived fields differ', async () => {
  saveRecord({ ...sampleRecord('2026-09-01', 60), fatigue: 0.9 })
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 60))

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('백업 파일'), text)
  await waitFor(() => view.getByRole('region', { name: '복원 미리보기' }))

  expect(view.getByLabelText(/백업 기록 사용/).parentElement?.textContent).toBe('백업 기록 사용 — 플랭크 60초 · 스쿼트 20회 · 푸시업 15회')
})

test('conflict labels show non-summary fields such as success flags', async () => {
  saveRecord({ ...sampleRecord('2026-09-01', 60), plank: { target_sec: 60, actual_sec: 60, success: false } })
  const text = exportBackupText()
  saveRecord(sampleRecord('2026-09-01', 60))

  const view = render(<BackupRestore onRestored={() => {}} />)
  chooseFile(view.getByLabelText('백업 파일'), text)
  await waitFor(() => view.getByRole('region', { name: '복원 미리보기' }))

  expect(view.getByLabelText(/현재 기록 유지/).parentElement?.textContent).toBe('현재 기록 유지 — 플랭크 성공: 예')
  expect(view.getByLabelText(/백업 기록 사용/).parentElement?.textContent).toBe('백업 기록 사용 — 플랭크 성공: 아니오')
})
