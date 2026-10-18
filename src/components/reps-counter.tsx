import { useRef, useState } from 'react'
import { EXERCISE_LABEL, REPS_COPY, formatReps, formatTomorrowRecommendation } from '../locales/ko'

function isValidDraft(value: string): boolean {
  return /^\d{1,4}$/.test(value)
}

interface RepsCounterProps {
  title?: string
  idPrefix?: string
  exerciseName?: string
  count?: number
  targetReps?: number
  showRecommendation?: boolean
  tomorrowTargetReps?: number
  tomorrowDeltaReps?: number
  recommendationReasonText?: string
  saveFeedbackText?: string
  saveFeedbackTone?: 'info' | 'success' | 'error'
  onDoneRepsChange?: (rawValue: string) => void
  onComplete?: () => void
}

export default function RepsCounter({
  title = REPS_COPY.squatTitle,
  idPrefix = 'squat',
  exerciseName = EXERCISE_LABEL.squat,
  count = 0,
  targetReps = 0,
  showRecommendation = false,
  tomorrowTargetReps = 0,
  tomorrowDeltaReps = 0,
  recommendationReasonText = '',
  saveFeedbackText = '',
  saveFeedbackTone = 'info',
  onDoneRepsChange,
  onComplete,
}: RepsCounterProps) {
  const goalReached = targetReps > 0 && count >= targetReps
  const [draft, setDraft] = useState<string | null>(null)
  // Set when the edit was already closed (submit/Escape) so a blur fired by unmounting the input is ignored.
  const editClosedRef = useRef(false)

  // A button tap may not blur the input (e.g. iOS Safari), so buttons resolve an open draft themselves.
  function adjust(delta: number) {
    const base = draft !== null && isValidDraft(draft) ? Number(draft) : count
    if (draft !== null) {
      editClosedRef.current = true
      setDraft(null)
    }
    onDoneRepsChange?.(String(Math.max(0, base + delta)))
  }

  function complete() {
    if (draft !== null) closeDraft(true)
    onComplete?.()
  }

  function openDraft() {
    editClosedRef.current = false
    setDraft(String(count))
  }

  function closeDraft(commit: boolean) {
    if (editClosedRef.current) return
    editClosedRef.current = true
    if (commit && draft !== null && isValidDraft(draft) && Number(draft) !== count) onDoneRepsChange?.(draft)
    setDraft(null)
  }

  return (
    <div className={`reps-counter${goalReached ? ' reps-counter--goal-reached' : ''}`}>
      <h2>{title}</h2>
      <div className="reps-display">
        {draft === null
          ? (
            <button
              type="button"
              className="reps-display__count"
              aria-label={REPS_COPY.countAriaLabel(count, targetReps)}
              onClick={openDraft}
            >
              <span className="reps-display__value">{count}</span>
              <span className="reps-display__target">/ {targetReps}</span>
            </button>
          )
          : (
            <form
              className="reps-display__form"
              onSubmit={(event) => {
                event.preventDefault()
                closeDraft(true)
              }}
            >
              <label className="visually-hidden" htmlFor={`${idPrefix}-done-reps`}>{REPS_COPY.doneReps}</label>
              <input
                id={`${idPrefix}-done-reps`}
                className="reps-input reps-display__input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                enterKeyHint="done"
                // biome-ignore lint/a11y/noAutofocus: the input only exists after the user taps the count to edit it
                autoFocus
                value={draft}
                onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
                onBlur={() => closeDraft(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeDraft(false)
                }}
              />
              <span className="reps-display__target">/ {targetReps}</span>
            </form>
          )}
      </div>
      <div className="reps-adjust">
        <button
          type="button"
          className="btn btn--secondary reps-adjust__minor"
          aria-label={REPS_COPY.decrementAriaLabel}
          disabled={count <= 0}
          onClick={() => adjust(-1)}
        >
          {REPS_COPY.decrement}
        </button>
        <button
          type="button"
          className="btn reps-adjust__major"
          aria-label={REPS_COPY.incrementAriaLabel}
          onClick={() => adjust(1)}
        >
          {REPS_COPY.increment}
        </button>
        <button
          type="button"
          className="btn btn--secondary reps-adjust__minor"
          aria-label={REPS_COPY.incrementFiveAriaLabel}
          onClick={() => adjust(5)}
        >
          {REPS_COPY.incrementFive}
        </button>
      </div>
      {showRecommendation
        ? (
          <div className="recommendation-note">
            <div className="recommendation-note__target">
              {formatTomorrowRecommendation(tomorrowTargetReps, tomorrowDeltaReps, formatReps)}
            </div>
            <div className="recommendation-note__reason">{recommendationReasonText}</div>
          </div>
        )
        : null}
      <div className="reps-controls">
        <button
          type="button"
          className={`btn btn--primary reps-complete${goalReached ? ' reps-complete--ready' : ''}`}
          aria-label={REPS_COPY.completeAriaLabel(exerciseName)}
          onClick={complete}
        >
          {REPS_COPY.complete}
        </button>
      </div>
      {saveFeedbackText
        ? (
          <p
            className={`reps-save-feedback reps-save-feedback--${saveFeedbackTone}`}
            role={saveFeedbackTone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {saveFeedbackText}
          </p>
        )
        : null}
    </div>
  )
}
