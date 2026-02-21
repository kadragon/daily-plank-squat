interface DailySummaryProps {
  plankTargetSec?: number
  squatTargetReps?: number
  pushupTargetReps?: number
  deadhangTargetSec?: number
  tomorrowPlankTargetSec?: number
  tomorrowSquatTargetReps?: number
  tomorrowPushupTargetReps?: number
  tomorrowDeadhangTargetSec?: number
  plankSuccess?: boolean
  squatSuccess?: boolean
  pushupSuccess?: boolean
  deadhangSuccess?: boolean
  fatigue?: number
  overloadWarning?: boolean
  suspiciousSession?: boolean
  onExportToHealth?: () => void
  healthExportEnabled?: boolean
  healthExportHint?: string
}

export default function DailySummary({
  plankTargetSec = 0,
  squatTargetReps = 0,
  pushupTargetReps = 0,
  deadhangTargetSec = 0,
  tomorrowPlankTargetSec = 0,
  tomorrowSquatTargetReps = 0,
  tomorrowPushupTargetReps = 0,
  tomorrowDeadhangTargetSec = 0,
  plankSuccess = false,
  squatSuccess = false,
  pushupSuccess = false,
  deadhangSuccess = false,
  fatigue = 0,
  overloadWarning = false,
  suspiciousSession = false,
  onExportToHealth,
  healthExportEnabled = false,
  healthExportHint = '',
}: DailySummaryProps) {
  const canExportToHealth = healthExportEnabled && typeof onExportToHealth === 'function'

  return (
    <div className="daily-summary">
      <h2>Daily Summary</h2>
      <section>
        <div className="summary-stat">Plank target: {plankTargetSec}s</div>
        <div className="summary-stat">Squat target: {squatTargetReps}</div>
        <div className="summary-stat">Pushup target: {pushupTargetReps}</div>
        <div className="summary-stat">Deadhang target: {deadhangTargetSec}s</div>
        <div className="summary-stat">Plank: {plankSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Squat: {squatSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Pushup: {pushupSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Deadhang: {deadhangSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Fatigue: {fatigue.toFixed(3)}</div>
      </section>
      <section>
        <div className="summary-stat">Tomorrow plank target: {tomorrowPlankTargetSec}s</div>
        <div className="summary-stat">Tomorrow squat target: {tomorrowSquatTargetReps}</div>
        <div className="summary-stat">Tomorrow pushup target: {tomorrowPushupTargetReps}</div>
        <div className="summary-stat">Tomorrow deadhang target: {tomorrowDeadhangTargetSec}s</div>
      </section>
      <section>
        <button
          type="button"
          className="btn"
          onClick={onExportToHealth}
          disabled={!canExportToHealth}
        >
          Apple 건강에 기록
        </button>
        {healthExportHint ? <div className="summary-stat">{healthExportHint}</div> : null}
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
