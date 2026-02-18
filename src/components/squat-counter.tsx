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
  let intervalId: ReturnType<typeof setInterval> | null = null

  function stopLongPress() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function startLongPress() {
    stopLongPress()
    intervalId = setInterval(() => {
      onIncrement?.()
    }, 120)
  }

  return (
    <div>
      <div>Target reps: {targetReps}</div>
      <div>Count: {count}</div>
      <button
        type="button"
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
      <button type="button" onClick={onDecrement}>-1</button>
      <button type="button" onClick={onComplete}>Complete</button>
    </div>
  )
}
