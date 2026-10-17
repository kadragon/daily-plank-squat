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
  return value ? 'yes' : 'no'
}

interface ExerciseResult {
  actual: number
  target: number
  success: boolean
}

function exerciseParts(name: string, unit: string, result: ExerciseResult | null): string[] {
  if (!result) return [`${name} none`]
  return [
    `${name} ${result.actual}${unit}`,
    `${name} target ${result.target}${unit}`,
    `${name} success: ${yesNo(result.success)}`,
  ]
}

// The leading three parts are the main summary; the rest cover every other stored, non-derived field.
function recordParts(record: DailyRecord): string[] {
  const reps = (r: { target_reps: number, actual_reps: number, success: boolean }) =>
    ({ actual: r.actual_reps, target: r.target_reps, success: r.success })
  const secs = (r: { target_sec: number, actual_sec: number, success: boolean }) =>
    ({ actual: r.actual_sec, target: r.target_sec, success: r.success })
  const [plank, ...plankRest] = exerciseParts('Plank', 's', secs(record.plank))
  const [squat, ...squatRest] = exerciseParts('Squat', '', reps(record.squat))
  const [pushup, ...pushupRest] = exerciseParts('Pushup', '', reps(record.pushup))
  return [
    plank,
    squat,
    pushup,
    ...plankRest,
    ...squatRest,
    ...pushupRest,
    ...exerciseParts('Deadhang', 's', secs(record.deadhang)),
    ...exerciseParts('Dumbbell', '', record.dumbbell && reps(record.dumbbell)),
    `Squat done: ${yesNo(record.squat_completed)}`,
    `Pushup done: ${yesNo(record.pushup_completed)}`,
    `Dumbbell done: ${yesNo(record.dumbbell_completed)}`,
    `Day: ${record.day_type ?? 'training'}`,
    `Flagged: ${yesNo(record.flag_suspicious)}`,
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
      ? `Exported ${backup.records.length} records. Skipped invalid records: ${skippedDates.join(', ')}.`
      : `Exported ${backup.records.length} records.`)
  }

  async function handleFileChange(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    // A later pick supersedes any read still in flight; the old preview goes away so it cannot be applied meanwhile.
    const readId = ++readIdRef.current
    setPending(null)
    setMessage('Reading file…')
    let text: string
    try {
      text = await file.text()
    } catch (err) {
      if (readId !== readIdRef.current) return
      console.warn('[BackupRestore] file read failed:', err)
      setMessage('Could not read the file — nothing was changed.')
      return
    }
    if (readId !== readIdRef.current) return

    const result = parseBackup(text)
    if (!result.ok) {
      setMessage(`Invalid backup file — nothing was changed. (${result.error})`)
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
      setMessage('Restore failed — existing data was kept.')
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
      <h3>Backup</h3>
      <p className="settings__backup-note">Files stay on this device. Nothing is uploaded.</p>
      <div className="settings__backup-actions">
        <button type="button" className="btn" onClick={handleExport}>
          Export backup
        </button>
        <label className="btn btn--danger settings__backup-file">
          Restore from file
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Backup file"
            onChange={(e) => { void handleFileChange(e.currentTarget) }}
          />
        </label>
      </div>
      {message ? <p className="settings__backup-message" role="status">{message}</p> : null}
      {pending ? (
        <section className="settings__backup-preview" aria-label="Restore preview">
          <p>
            {`Backup from ${backupDateKey(pending.backup)}: `
              + `${pending.preview.newDates.length} new, `
              + `${pending.preview.identicalDates.length} unchanged, `
              + `${pending.preview.conflicts.length} conflicting days.`}
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
                  Keep current — {describeConflict(conflict.existing, conflict.incoming)}
                </label>
                <label>
                  <input
                    type="radio"
                    name={`conflict-${conflict.date}`}
                    checked={choice === 'replace'}
                    onChange={() => setChoice(conflict.date, 'replace')}
                  />
                  Use backup — {describeConflict(conflict.incoming, conflict.existing)}
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
              Also restore settings
            </label>
          ) : null}
          <div className="settings__backup-actions">
            <button type="button" className="btn" onClick={handleConfirm}>
              Apply restore
            </button>
            <button type="button" className="btn btn--danger" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
