import RepsCounter from './reps-counter'

interface SquatCounterProps {
  count?: number
  targetReps?: number
  saveFeedbackText?: string
  saveFeedbackTone?: 'info' | 'success' | 'error'
  onTargetRepsChange?: (rawValue: string) => void
  onDoneRepsChange?: (rawValue: string) => void
  onComplete?: () => void
}

export default function SquatCounter(props: SquatCounterProps) {
  return (
    <RepsCounter
      title="Squat Counter"
      idPrefix="squat"
      exerciseName="squats"
      {...props}
    />
  )
}
