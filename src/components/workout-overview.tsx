import type { DailyRecord } from '../types'
import DailySummary from './daily-summary'
import WorkoutStats from './workout-stats'

interface WorkoutOverviewProps {
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
  records?: DailyRecord[]
}

export default function WorkoutOverview({
  plankTargetSec,
  squatTargetReps,
  pushupTargetReps,
  deadhangTargetSec,
  dumbbellTargetReps,
  tomorrowPlankTargetSec,
  tomorrowSquatTargetReps,
  tomorrowPushupTargetReps,
  tomorrowDeadhangTargetSec,
  tomorrowDumbbellTargetReps,
  plankSuccess,
  squatSuccess,
  pushupSuccess,
  deadhangSuccess,
  dumbbellSuccess,
  fatigue,
  overloadWarning,
  suspiciousSession,
  onExportToHealth,
  healthExportEnabled,
  healthExportHint,
  records,
}: WorkoutOverviewProps) {
  return (
    <div className="workout-overview">
      <DailySummary
        plankTargetSec={plankTargetSec}
        squatTargetReps={squatTargetReps}
        pushupTargetReps={pushupTargetReps}
        deadhangTargetSec={deadhangTargetSec}
        dumbbellTargetReps={dumbbellTargetReps}
        tomorrowPlankTargetSec={tomorrowPlankTargetSec}
        tomorrowSquatTargetReps={tomorrowSquatTargetReps}
        tomorrowPushupTargetReps={tomorrowPushupTargetReps}
        tomorrowDeadhangTargetSec={tomorrowDeadhangTargetSec}
        tomorrowDumbbellTargetReps={tomorrowDumbbellTargetReps}
        plankSuccess={plankSuccess}
        squatSuccess={squatSuccess}
        pushupSuccess={pushupSuccess}
        deadhangSuccess={deadhangSuccess}
        dumbbellSuccess={dumbbellSuccess}
        fatigue={fatigue}
        overloadWarning={overloadWarning}
        suspiciousSession={suspiciousSession}
        onExportToHealth={onExportToHealth}
        healthExportEnabled={healthExportEnabled}
        healthExportHint={healthExportHint}
      />
      <WorkoutStats records={records} />
    </div>
  )
}
