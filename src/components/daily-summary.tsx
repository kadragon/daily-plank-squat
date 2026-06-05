import type { DayType } from '../types'
import { DAY_TYPE_LABEL, RECOVERY_GUIDE_ITEMS } from '../locales/ko'

interface DailySummaryProps {
  plankTargetSec?: number
  squatTargetReps?: number
  pushupTargetReps?: number
  deadhangTargetSec?: number
  dumbbellTargetReps?: number
  tomorrowPlankTargetSec?: number
  tomorrowSquatTargetReps?: number
  tomorrowPushupTargetReps?: number
  tomorrowDeadhangTargetSec?: number
  tomorrowDumbbellTargetReps?: number
  tomorrowDayType?: DayType
  plankSuccess?: boolean
  squatSuccess?: boolean
  pushupSuccess?: boolean
  deadhangSuccess?: boolean
  dumbbellSuccess?: boolean
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
  dumbbellTargetReps = 0,
  tomorrowPlankTargetSec = 0,
  tomorrowSquatTargetReps = 0,
  tomorrowPushupTargetReps = 0,
  tomorrowDeadhangTargetSec = 0,
  tomorrowDumbbellTargetReps = 0,
  tomorrowDayType = 'training',
  plankSuccess = false,
  squatSuccess = false,
  pushupSuccess = false,
  deadhangSuccess = false,
  dumbbellSuccess = false,
  fatigue = 0,
  overloadWarning = false,
  suspiciousSession = false,
  onExportToHealth,
  healthExportEnabled = false,
  healthExportHint = '',
}: DailySummaryProps) {
  const canExportToHealth = healthExportEnabled && typeof onExportToHealth === 'function'
  const isRecoveryDay = tomorrowDayType === 'recovery'

  return (
    <div className="daily-summary">
      <h2>Daily Summary</h2>
      <section>
        <div className="summary-stat">Plank target: {plankTargetSec}s</div>
        <div className="summary-stat">Squat target: {squatTargetReps}</div>
        <div className="summary-stat">Pushup target: {pushupTargetReps}</div>
        <div className="summary-stat">Deadhang target: {deadhangTargetSec}s</div>
        <div className="summary-stat">Dumbbell target: {dumbbellTargetReps}</div>
        <div className="summary-stat">Plank: {plankSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Squat: {squatSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Pushup: {pushupSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Deadhang: {deadhangSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Dumbbell: {dumbbellSuccess ? 'Complete' : 'Incomplete'}</div>
        <div className="summary-stat">Fatigue: {fatigue.toFixed(3)}</div>
      </section>
      <section>
        <div className="summary-stat summary-day-type">
          내일: <span className={`day-type-badge day-type-${tomorrowDayType}`}>{DAY_TYPE_LABEL[tomorrowDayType]}</span>
        </div>
        {isRecoveryDay ? (
          <div className="recovery-guide">
            <div className="summary-stat">회복일 — 스트레칭 & 모빌리티 루틴</div>
            <ul className="recovery-guide-list">
              {RECOVERY_GUIDE_ITEMS.map((item) => (
                <li key={item} className="recovery-guide-item">{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="summary-stat">Tomorrow plank target: {tomorrowPlankTargetSec}s</div>
            <div className="summary-stat">Tomorrow squat target: {tomorrowSquatTargetReps}</div>
            <div className="summary-stat">Tomorrow pushup target: {tomorrowPushupTargetReps}</div>
            <div className="summary-stat">Tomorrow deadhang target: {tomorrowDeadhangTargetSec}s</div>
            <div className="summary-stat">Tomorrow dumbbell target: {tomorrowDumbbellTargetReps}</div>
          </>
        )}
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
