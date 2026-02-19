interface RepsCounterProps {
  title?: string
  idPrefix?: string
  exerciseName?: string
  count?: number
  targetReps?: number
  onTargetRepsChange?: (rawValue: string) => void
  onDoneRepsChange?: (rawValue: string) => void
  onComplete?: () => void
}

export default function RepsCounter({
  title = 'Squat Counter',
  idPrefix = 'squat',
  exerciseName = 'squats',
  count = 0,
  targetReps = 0,
  onTargetRepsChange,
  onDoneRepsChange,
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
          onChange={(event) => onTargetRepsChange?.(event.currentTarget.value)}
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
          onChange={(event) => onDoneRepsChange?.(event.currentTarget.value)}
        />
      </div>
      <div className="reps-controls">
        <button type="button" className="btn" aria-label={`Complete ${exerciseName}`} onClick={onComplete}>Complete</button>
      </div>
    </div>
  )
}
