import type { DayType } from '../types'
import {
  DAY_TYPE_LABEL,
  EXERCISE_LABEL,
  RECOVERY_DAY_SUBTITLE,
  RECOVERY_GUIDE_ITEMS,
  SUMMARY_COPY,
  TOMORROW_LABEL,
  formatReps,
  formatSeconds,
} from '../locales/ko'

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
      <h2>{SUMMARY_COPY.title}</h2>
      <section>
        <div className="summary-stat">{SUMMARY_COPY.target(EXERCISE_LABEL.plank, formatSeconds(plankTargetSec))}</div>
        <div className="summary-stat">{SUMMARY_COPY.target(EXERCISE_LABEL.squat, formatReps(squatTargetReps))}</div>
        <div className="summary-stat">{SUMMARY_COPY.target(EXERCISE_LABEL.pushup, formatReps(pushupTargetReps))}</div>
        <div className="summary-stat">{SUMMARY_COPY.target(EXERCISE_LABEL.deadhang, formatSeconds(deadhangTargetSec))}</div>
        <div className="summary-stat">{SUMMARY_COPY.target(EXERCISE_LABEL.dumbbell, formatReps(dumbbellTargetReps))}</div>
        <div className="summary-stat">{SUMMARY_COPY.status(EXERCISE_LABEL.plank, plankSuccess)}</div>
        <div className="summary-stat">{SUMMARY_COPY.status(EXERCISE_LABEL.squat, squatSuccess)}</div>
        <div className="summary-stat">{SUMMARY_COPY.status(EXERCISE_LABEL.pushup, pushupSuccess)}</div>
        <div className="summary-stat">{SUMMARY_COPY.status(EXERCISE_LABEL.deadhang, deadhangSuccess)}</div>
        <div className="summary-stat">{SUMMARY_COPY.status(EXERCISE_LABEL.dumbbell, dumbbellSuccess)}</div>
        <div className="summary-stat">{SUMMARY_COPY.fatigue(fatigue.toFixed(3))}</div>
      </section>
      <section>
        <div className="summary-stat summary-day-type">
          {TOMORROW_LABEL}: <span className={`day-type-badge day-type-${tomorrowDayType}`}>{DAY_TYPE_LABEL[tomorrowDayType]}</span>
        </div>
        {isRecoveryDay ? (
          <div className="recovery-guide">
            <div className="summary-stat">{RECOVERY_DAY_SUBTITLE}</div>
            <ul className="recovery-guide-list">
              {RECOVERY_GUIDE_ITEMS.map((item) => (
                <li key={item} className="recovery-guide-item">{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="summary-stat">{SUMMARY_COPY.tomorrowTarget(EXERCISE_LABEL.plank, formatSeconds(tomorrowPlankTargetSec))}</div>
            <div className="summary-stat">{SUMMARY_COPY.tomorrowTarget(EXERCISE_LABEL.squat, formatReps(tomorrowSquatTargetReps))}</div>
            <div className="summary-stat">{SUMMARY_COPY.tomorrowTarget(EXERCISE_LABEL.pushup, formatReps(tomorrowPushupTargetReps))}</div>
            <div className="summary-stat">{SUMMARY_COPY.tomorrowTarget(EXERCISE_LABEL.deadhang, formatSeconds(tomorrowDeadhangTargetSec))}</div>
            <div className="summary-stat">{SUMMARY_COPY.tomorrowTarget(EXERCISE_LABEL.dumbbell, formatReps(tomorrowDumbbellTargetReps))}</div>
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
          {SUMMARY_COPY.healthExport}
        </button>
        {healthExportHint ? <div className="summary-stat">{healthExportHint}</div> : null}
      </section>
      {overloadWarning ? (
        <div className="summary-warning" role="alert">{SUMMARY_COPY.overloadWarning}</div>
      ) : null}
      {suspiciousSession ? (
        <div className="summary-warning" role="alert">{SUMMARY_COPY.suspiciousWarning}</div>
      ) : null}
    </div>
  )
}
