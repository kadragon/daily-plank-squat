import { useRef } from 'react'

interface SquatCounterProps {
  count?: number
  targetReps?: number
  onIncrement?: () => void
  onDecrement?: () => void
  onComplete?: () => void
}

export default function SquatCounter({
  count = 0,
  targetReps = 0,
  onIncrement,
  onDecrement,
  onComplete,
}: SquatCounterProps) {
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopLongPress() {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }
  }

  function startLongPress() {
    stopLongPress()
    intervalIdRef.current = setInterval(() => {
      onIncrement?.()
    }, 120)
  }

  const goalReached = targetReps > 0 && count >= targetReps

  return (
    <div className={`squat-counter${goalReached ? ' squat-counter--goal-reached' : ''}`}>
      <h2>Squat Counter</h2>
      <div className="squat-target">Target reps: {targetReps}</div>
      <div className="squat-count" aria-live="polite">Count: {count}</div>
      <div className="squat-controls">
        <button
          type="button"
          className="btn btn--large"
          aria-label="Increment"
          onClick={onIncrement}
          onMouseDown={startLongPress}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={stopLongPress}
          onTouchCancel={stopLongPress}
        >
          +1
        </button>
        <button type="button" className="btn" aria-label="Decrement" onClick={onDecrement}>-1</button>
        <button type="button" className="btn" aria-label="Complete squats" onClick={onComplete}>Complete</button>
      </div>
    </div>
  )
}
