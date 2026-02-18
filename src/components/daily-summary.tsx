interface DailySummaryProps {
  plankTargetSec?: number
  squatTargetCount?: number
  plankSuccess?: boolean
  squatSuccess?: boolean
}

export default function DailySummary({
  plankTargetSec = 0,
  squatTargetCount = 0,
  plankSuccess = false,
  squatSuccess = false,
}: DailySummaryProps) {
  return (
    <div>
      <div>Plank target: {plankTargetSec}s</div>
      <div>Squat target: {squatTargetCount}</div>
      <div>Plank: {plankSuccess ? 'Complete' : 'Incomplete'}</div>
      <div>Squat: {squatSuccess ? 'Complete' : 'Incomplete'}</div>
    </div>
  )
}
