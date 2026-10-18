import { EXERCISE_LABEL, REPS_COPY, formatReps, formatTomorrowRecommendation } from '../locales/ko'

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
  onTargetRepsChange?: (rawValue: string) => void
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
  onTargetRepsChange,
  onDoneRepsChange,
  onComplete,
}: RepsCounterProps) {
  const goalReached = targetReps > 0 && count >= targetReps

  return (
    <div className={`reps-counter${goalReached ? ' reps-counter--goal-reached' : ''}`}>
      <h2>{title}</h2>
      <div className="reps-input-row">
        <label className="reps-input-label" htmlFor={`${idPrefix}-target-reps`}>{REPS_COPY.targetReps}</label>
        <input
          id={`${idPrefix}-target-reps`}
          className="reps-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={REPS_COPY.targetReps}
          value={targetReps}
          onInput={(event) => onTargetRepsChange?.((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <div className="reps-input-row">
        <label className="reps-input-label" htmlFor={`${idPrefix}-done-reps`}>{REPS_COPY.doneReps}</label>
        <input
          id={`${idPrefix}-done-reps`}
          className="reps-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={REPS_COPY.doneReps}
          value={count}
          onInput={(event) => onDoneRepsChange?.((event.currentTarget as HTMLInputElement).value)}
        />
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
        <button type="button" className="btn" aria-label={REPS_COPY.completeAriaLabel(exerciseName)} onClick={onComplete}>{REPS_COPY.complete}</button>
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
