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
