interface SquatCounterProps {
  count?: number
  targetReps?: number
  onTargetRepsChange?: (rawValue: string) => void
  onDoneRepsChange?: (rawValue: string) => void
  onComplete?: () => void
}

export default function SquatCounter({
  count = 0,
  targetReps = 0,
  onTargetRepsChange,
  onDoneRepsChange,
  onComplete,
}: SquatCounterProps) {
  const goalReached = targetReps > 0 && count >= targetReps

  return (
    <div className={`squat-counter${goalReached ? ' squat-counter--goal-reached' : ''}`}>
      <h2>Squat Counter</h2>
      <div className="squat-input-row">
        <label className="squat-input-label" htmlFor="squat-target-reps">Target reps</label>
        <input
          id="squat-target-reps"
          className="squat-input"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          aria-label="Target reps"
          value={targetReps}
          onChange={(event) => onTargetRepsChange?.(event.currentTarget.value)}
        />
      </div>
      <div className="squat-input-row">
        <label className="squat-input-label" htmlFor="squat-done-reps">Done reps</label>
        <input
          id="squat-done-reps"
          className="squat-input"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          aria-label="Done reps"
          value={count}
          onChange={(event) => onDoneRepsChange?.(event.currentTarget.value)}
        />
      </div>
      <div className="squat-controls">
        <button type="button" className="btn" aria-label="Complete squats" onClick={onComplete}>Complete</button>
      </div>
    </div>
  )
}
