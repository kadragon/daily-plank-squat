import type { DayType } from '../types'
import type { ExerciseId } from '../storage/settings'
import {
  DAY_TYPE_LABEL,
  RECOVERY_DAY_SUBTITLE,
  RECOVERY_GUIDE_ITEMS,
  SUMMARY_COPY,
  TOMORROW_LABEL,
} from '../locales/ko'

export interface TodayExerciseCard {
  id: ExerciseId
  label: string
  actual: string
  target: string
  completed: boolean
  recommendationText?: string
}

interface TodayWorkoutProps {
  exercises?: TodayExerciseCard[]
  tomorrowDayType?: DayType
  fatigue?: number
  overloadWarning?: boolean
  suspiciousSession?: boolean
  onOpenExercise?: (id: ExerciseId) => void
  onExportToHealth?: () => void
  healthExportEnabled?: boolean
  healthExportHint?: string
}

export default function TodayWorkout({
  exercises = [],
  tomorrowDayType = 'training',
  fatigue = 0,
  overloadWarning = false,
  suspiciousSession = false,
  onOpenExercise,
  onExportToHealth,
  healthExportEnabled = false,
  healthExportHint = '',
}: TodayWorkoutProps) {
  const canExportToHealth = healthExportEnabled && typeof onExportToHealth === 'function'
  const completedCount = exercises.filter((exercise) => exercise.completed).length
  const allCompleted = exercises.length > 0 && completedCount === exercises.length
  const isRecoveryDay = tomorrowDayType === 'recovery'

  return (
    <div className="daily-summary today-workout">
      <h2>{SUMMARY_COPY.title}</h2>
      <section className="today-workout__progress" aria-label={SUMMARY_COPY.progressAriaLabel}>
        <div className="today-workout__progress-count">{SUMMARY_COPY.progress(completedCount, exercises.length)}</div>
        <progress max={Math.max(1, exercises.length)} value={completedCount} />
      </section>
      <section className="today-workout__banners">
        <div className="summary-stat">{SUMMARY_COPY.fatigue(fatigue.toFixed(3))}</div>
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
        ) : null}
        {overloadWarning ? (
          <div className="summary-warning" role="alert">{SUMMARY_COPY.overloadWarning}</div>
        ) : null}
        {suspiciousSession ? (
          <div className="summary-warning" role="alert">{SUMMARY_COPY.suspiciousWarning}</div>
        ) : null}
      </section>
      {exercises.length === 0 ? (
        <p className="today-workout__empty">{SUMMARY_COPY.noExercises}</p>
      ) : (
        <ul className="today-workout__cards" aria-label={SUMMARY_COPY.exercisesAriaLabel}>
          {exercises.map((exercise) => {
            const value = SUMMARY_COPY.actualOfTarget(exercise.actual, exercise.target)
            const recommendationText = isRecoveryDay ? undefined : exercise.recommendationText
            const status = [value, exercise.completed ? SUMMARY_COPY.completed : null, recommendationText ?? null]
              .filter((part) => part !== null)
              .join(', ')
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  className={`exercise-card${exercise.completed ? ' exercise-card--completed' : ''}`}
                  aria-label={SUMMARY_COPY.openAriaLabel(exercise.label, status)}
                  onClick={() => onOpenExercise?.(exercise.id)}
                >
                  <span className="exercise-card__header">
                    <span className="exercise-card__name">{exercise.label}</span>
                    {exercise.completed ? <span className="exercise-card__done">✓ {SUMMARY_COPY.completed}</span> : null}
                  </span>
                  <span className="exercise-card__value">{value}</span>
                  {recommendationText ? (
                    <span className="exercise-card__recommendation">{recommendationText}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <section>
        <button
          type="button"
          className={`btn${allCompleted ? ' btn--primary today-workout__export--emphasized' : ' btn--secondary'}`}
          onClick={onExportToHealth}
          disabled={!canExportToHealth}
        >
          {SUMMARY_COPY.healthExport}
        </button>
        {healthExportHint ? <div className="summary-stat">{healthExportHint}</div> : null}
      </section>
    </div>
  )
}
