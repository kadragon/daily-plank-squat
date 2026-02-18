interface SquatCounterProps {
  count?: number
}

export default function SquatCounter({ count = 0 }: SquatCounterProps) {
  return (
    <div>
      <div>Count: {count}</div>
      <button type="button">+1</button>
      <button type="button">-1</button>
      <button type="button">Complete</button>
    </div>
  )
}
