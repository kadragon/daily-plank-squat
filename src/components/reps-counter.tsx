interface RepsCounterProps {
  title?: string
  idPrefix?: string
  exerciseName?: string
  count?: number
  targetReps?: number
  rpe?: number
  tomorrowTargetReps?: number
  tomorrowDeltaReps?: number
  recommendationReasonText?: string
  saveFeedbackText?: string
  saveFeedbackTone?: 'info' | 'success' | 'error'
  onTargetRepsChange?: (rawValue: string) => void
  onDoneRepsChange?: (rawValue: string) => void
  onRpeChange?: (rawValue: string) => void
  onComplete?: () => void
}

export default function RepsCounter({
  title = 'Squat Counter',
  idPrefix = 'squat',
  exerciseName = 'squats',
  count = 0,
  targetReps = 0,
  rpe = 5,
  tomorrowTargetReps = 0,
  tomorrowDeltaReps = 0,
  recommendationReasonText = '',
  saveFeedbackText = '',
  saveFeedbackTone = 'info',
  onTargetRepsChange,
  onDoneRepsChange,
  onRpeChange,
  onComplete,
}: RepsCounterProps) {
  const goalReached = targetReps > 0 && count >= targetReps

  return (
    <div className={`reps-counter${goalReached ? ' reps-counter--goal-reached' : ''}`}>
      <h2>{title}</h2>
      <div className="reps-input-row">
        <label className="reps-input-label" htmlFor={`${idPrefix}-target-reps`}>Target reps</label>
        <input
          id={`${idPrefix}-target-reps`}
          className="reps-input"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          aria-label="Target reps"
          value={targetReps}
          onInput={(event) => onTargetRepsChange?.((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <div className="reps-input-row">
        <label className="reps-input-label" htmlFor={`${idPrefix}-done-reps`}>Done reps</label>
        <input
          id={`${idPrefix}-done-reps`}
          className="reps-input"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          aria-label="Done reps"
          value={count}
          onInput={(event) => onDoneRepsChange?.((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <div className="reps-input-row">
        <label className="reps-input-label" htmlFor={`${idPrefix}-rpe`}>RPE (1-10): {rpe}</label>
        <input
          id={`${idPrefix}-rpe`}
          className="rpe-slider"
          type="range"
          min={1}
          max={10}
          step={1}
          aria-label="RPE"
          value={rpe}
          onInput={(event) => onRpeChange?.((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <div className="recommendation-note">
        <div className="recommendation-note__target">
          내일 추천: {tomorrowTargetReps} ({tomorrowDeltaReps > 0 ? '+' : ''}{tomorrowDeltaReps})
        </div>
        <div className="recommendation-note__reason">{recommendationReasonText}</div>
      </div>
      <div className="reps-controls">
        <button type="button" className="btn" aria-label={`Complete ${exerciseName}`} onClick={onComplete}>Complete</button>
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
