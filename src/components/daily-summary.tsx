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
    <div className="daily-summary">
      <h2>Daily Summary</h2>
      <section>
        <div className="summary-stat">Plank target: {plankTargetSec}s</div>
        <div className="summary-stat">Squat target: {squatTargetReps}</div>
        <div className="summary-stat">Plank: {plankSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Squat: {squatSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Fatigue: {fatigue.toFixed(3)}</div>
      </section>
      <section>
        <div className="summary-stat">Tomorrow plank target: {tomorrowPlankTargetSec}s</div>
        <div className="summary-stat">Tomorrow squat target: {tomorrowSquatTargetReps}</div>
      </section>
      {overloadWarning ? (
        <div className="summary-warning" role="alert">Warning: load above 95th percentile</div>
      ) : null}
      {suspiciousSession ? (
        <div className="summary-warning" role="alert">Warning: unstable measurement environment</div>
      ) : null}
    </div>
  )
}
