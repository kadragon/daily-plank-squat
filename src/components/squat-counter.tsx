import RepsCounter from './reps-counter'

interface SquatCounterProps {
  count?: number
  targetReps?: number
  rpe?: number
  showRpe?: boolean
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
