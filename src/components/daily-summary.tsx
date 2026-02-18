interface DailySummaryProps {
  plankTargetSec?: number
  squatTargetReps?: number
  tomorrowPlankTargetSec?: number
  tomorrowSquatTargetReps?: number
  plankSuccess?: boolean
  squatSuccess?: boolean
  fatigue?: number
  overloadWarning?: boolean
  suspiciousSession?: boolean
}

export default function DailySummary({
  plankTargetSec = 0,
  squatTargetReps = 0,
  tomorrowPlankTargetSec = 0,
  tomorrowSquatTargetReps = 0,
  plankSuccess = false,
  squatSuccess = false,
  fatigue = 0,
  overloadWarning = false,
  suspiciousSession = false,
}: DailySummaryProps) {
  return (
    <div>
      <div>Plank target: {plankTargetSec}s</div>
      <div>Squat target: {squatTargetReps}</div>
      <div>Plank: {plankSuccess ? 'Complete' : 'Incomplete'}</div>
      <div>Squat: {squatSuccess ? 'Complete' : 'Incomplete'}</div>
      <div>Fatigue: {fatigue.toFixed(3)}</div>
      <div>Tomorrow plank target: {tomorrowPlankTargetSec}s</div>
      <div>Tomorrow squat target: {tomorrowSquatTargetReps}</div>
      {overloadWarning ? <div>Warning: load above 95th percentile</div> : null}
      {suspiciousSession ? <div>Warning: unstable measurement environment</div> : null}
    </div>
  )
}
