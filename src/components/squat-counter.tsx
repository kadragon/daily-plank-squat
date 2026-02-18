interface SquatCounterProps {
  count?: number
  onIncrement?: () => void
  onDecrement?: () => void
  onComplete?: () => void
}

export default function SquatCounter({
  count = 0,
  onIncrement,
  onDecrement,
  onComplete,
}: SquatCounterProps) {
  return (
    <div>
      <div>Count: {count}</div>
      <button type="button" onClick={onIncrement}>+1</button>
      <button type="button" onClick={onDecrement}>-1</button>
      <button type="button" onClick={onComplete}>Complete</button>
    </div>
  )
}
