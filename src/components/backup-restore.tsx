import { useRef, useState } from 'react'
import {
  applyRestore,
  backupDateKey,
  backupFileName,
  type BackupFile,
  type ConflictChoice,
  exportBackup,
  parseBackup,
  previewRestore,
  type RestorePreview,
  serializeBackup,
} from '../storage/backup'
import { BACKUP_COPY, DAY_TYPE_LABEL, EXERCISE_LABEL, REPS_UNIT, SECONDS_UNIT } from '../locales/ko'
import type { DailyRecord } from '../types'

interface BackupRestoreProps {
  onRestored: () => void
  downloadFile?: (fileName: string, contents: string) => void
}

interface PendingRestore {
  backup: BackupFile
  preview: RestorePreview
  choices: Record<string, ConflictChoice>
  includeSettings: boolean
}

function downloadViaBlob(fileName: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  // Safari ignores clicks on detached anchors and aborts downloads whose URL is revoked immediately.
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function yesNo(value: boolean): string {
  return value ? BACKUP_COPY.yes : BACKUP_COPY.no
}

interface ExerciseResult {
  actual: number
  target: number
  success: boolean
}

function exerciseParts(name: string, unit: string, result: ExerciseResult | null): string[] {
  if (!result) return [BACKUP_COPY.none(name)]
  return [
    BACKUP_COPY.actual(name, `${result.actual}${unit}`),
    BACKUP_COPY.target(name, `${result.target}${unit}`),
    BACKUP_COPY.success(name, yesNo(result.success)),
  ]
}

// The leading three parts are the main summary; the rest cover every other stored, non-derived field.
function recordParts(record: DailyRecord): string[] {
  const reps = (r: { target_reps: number, actual_reps: number, success: boolean }) =>
    ({ actual: r.actual_reps, target: r.target_reps, success: r.success })
  const secs = (r: { target_sec: number, actual_sec: number, success: boolean }) =>
    ({ actual: r.actual_sec, target: r.target_sec, success: r.success })
  const [plank, ...plankRest] = exerciseParts(EXERCISE_LABEL.plank, SECONDS_UNIT, secs(record.plank))
  const [squat, ...squatRest] = exerciseParts(EXERCISE_LABEL.squat, REPS_UNIT, reps(record.squat))
  const [pushup, ...pushupRest] = exerciseParts(EXERCISE_LABEL.pushup, REPS_UNIT, reps(record.pushup))
  return [
    plank,
    squat,
    pushup,
    ...plankRest,
    ...squatRest,
    ...pushupRest,
    ...exerciseParts(EXERCISE_LABEL.deadhang, SECONDS_UNIT, secs(record.deadhang)),
    ...exerciseParts(EXERCISE_LABEL.dumbbell, REPS_UNIT, record.dumbbell && reps(record.dumbbell)),
    BACKUP_COPY.done(EXERCISE_LABEL.squat, yesNo(record.squat_completed)),
    BACKUP_COPY.done(EXERCISE_LABEL.pushup, yesNo(record.pushup_completed)),
    BACKUP_COPY.done(EXERCISE_LABEL.dumbbell, yesNo(record.dumbbell_completed)),
    BACKUP_COPY.dayType(DAY_TYPE_LABEL[record.day_type ?? 'training']),
    BACKUP_COPY.flagged(yesNo(record.flag_suspicious)),
  ]
}

// Show only the parts that differ; when only derived fields (fatigue) differ, fall back to the main summary.
function describeConflict(record: DailyRecord, other: DailyRecord): string {
  const parts = recordParts(record)
  const otherParts = recordParts(other)
  const differing = parts.filter((part, i) => part !== otherParts[i])
  return (differing.length > 0 ? differing : parts.slice(0, 3)).join(' · ')
}

export default function BackupRestore({ onRestored, downloadFile = downloadViaBlob }: BackupRestoreProps) {
  const [pending, setPending] = useState<PendingRestore | null>(null)
  const [message, setMessage] = useState('')
  const readIdRef = useRef(0)

  function handleExport() {
    const { backup, skippedDates } = exportBackup()
    downloadFile(backupFileName(backup), serializeBackup(backup))
    setMessage(skippedDates.length > 0
      ? BACKUP_COPY.exportedWithSkipped(backup.records.length, skippedDates)
      : BACKUP_COPY.exported(backup.records.length))
  }

  async function handleFileChange(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    // A later pick supersedes any read still in flight; the old preview goes away so it cannot be applied meanwhile.
    const readId = ++readIdRef.current
    setPending(null)
    setMessage(BACKUP_COPY.reading)
    let text: string
    try {
      text = await file.text()
    } catch (err) {
      if (readId !== readIdRef.current) return
      console.warn('[BackupRestore] file read failed:', err)
      setMessage(BACKUP_COPY.readFailed)
      return
    }
    if (readId !== readIdRef.current) return

    const result = parseBackup(text)
    if (!result.ok) {
      setMessage(BACKUP_COPY.invalid(result.error))
      return
    }

    setMessage('')
    setPending({
      backup: result.backup,
      preview: previewRestore(result.backup),
      choices: {},
      includeSettings: true,
    })
  }

  function handleConfirm() {
    if (!pending) return
    try {
      applyRestore(pending.backup, { conflicts: pending.choices, includeSettings: pending.includeSettings })
    } catch (err) {
      console.warn('[BackupRestore] restore failed:', err)
      setMessage(BACKUP_COPY.restoreFailed)
      return
    }
    setPending(null)
    onRestored()
  }

  function setChoice(date: string, choice: ConflictChoice) {
    setPending((current) => current && { ...current, choices: { ...current.choices, [date]: choice } })
  }

  return (
    <section className="settings__backup">
      <h3>{BACKUP_COPY.title}</h3>
      <p className="settings__backup-note">{BACKUP_COPY.note}</p>
      <div className="settings__backup-actions">
        <button type="button" className="btn" onClick={handleExport}>
          {BACKUP_COPY.export}
        </button>
        <label className="btn btn--danger settings__backup-file">
          {BACKUP_COPY.restoreFromFile}
          <input
            type="file"
            accept="application/json,.json"
            aria-label={BACKUP_COPY.fileAriaLabel}
            onChange={(e) => { void handleFileChange(e.currentTarget) }}
          />
        </label>
      </div>
      {message ? <p className="settings__backup-message" role="status">{message}</p> : null}
      {pending ? (
        <section className="settings__backup-preview" aria-label={BACKUP_COPY.previewAriaLabel}>
          <p>
            {BACKUP_COPY.previewSummary(
              backupDateKey(pending.backup),
              pending.preview.newDates.length,
              pending.preview.identicalDates.length,
              pending.preview.conflicts.length,
            )}
          </p>
          {pending.preview.conflicts.map((conflict) => {
            const choice = pending.choices[conflict.date] ?? 'keep'
            return (
              <fieldset className="settings__backup-conflict" key={conflict.date}>
                <legend>{conflict.date}</legend>
                <label>
                  <input
                    type="radio"
                    name={`conflict-${conflict.date}`}
                    checked={choice === 'keep'}
                    onChange={() => setChoice(conflict.date, 'keep')}
                  />
                  {BACKUP_COPY.currentChoice(describeConflict(conflict.existing, conflict.incoming))}
                </label>
                <label>
                  <input
                    type="radio"
                    name={`conflict-${conflict.date}`}
                    checked={choice === 'replace'}
                    onChange={() => setChoice(conflict.date, 'replace')}
                  />
                  {BACKUP_COPY.backupChoice(describeConflict(conflict.incoming, conflict.existing))}
                </label>
              </fieldset>
            )
          })}
          {pending.preview.settingsChanged ? (
            <label className="settings__backup-settings">
              <input
                type="checkbox"
                checked={pending.includeSettings}
                onChange={(e) => {
                  const includeSettings = e.currentTarget.checked
                  setPending((current) => current && { ...current, includeSettings })
                }}
              />
              {BACKUP_COPY.includeSettings}
            </label>
          ) : null}
          <div className="settings__backup-actions">
            <button type="button" className="btn" onClick={handleConfirm}>
              {BACKUP_COPY.apply}
            </button>
            <button type="button" className="btn btn--danger" onClick={() => setPending(null)}>
              {BACKUP_COPY.cancel}
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
