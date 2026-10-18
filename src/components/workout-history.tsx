import { EXERCISE_LABEL, HISTORY_COPY, formatReps, formatSeconds } from '../locales/ko'
import type { DailyRecord } from '../types'
import WorkoutStats from './workout-stats'

interface WorkoutHistoryProps {
  records?: DailyRecord[]
}

// Exercises with no activity that day are omitted so skipped or disabled ones don't read as failures.
function formatRecordEntries(record: DailyRecord): string[] {
  const values: [string, number, (value: number) => string][] = [
    [EXERCISE_LABEL.plank, record.plank.actual_sec, formatSeconds],
    [EXERCISE_LABEL.squat, record.squat.actual_reps, formatReps],
    [EXERCISE_LABEL.pushup, record.pushup.actual_reps, formatReps],
    [EXERCISE_LABEL.deadhang, record.deadhang.actual_sec, formatSeconds],
    [EXERCISE_LABEL.dumbbell, record.dumbbell?.actual_reps ?? 0, formatReps],
  ]
  return values
    .filter(([, value]) => value > 0)
    .map(([label, value, format]) => HISTORY_COPY.entry(label, format(value)))
}

export default function WorkoutHistory({ records = [] }: WorkoutHistoryProps) {
  const newestFirst = records.toSorted((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="workout-history">
      <WorkoutStats records={records} />
      <section className="workout-history__days">
        <h2>{HISTORY_COPY.title}</h2>
        {newestFirst.length === 0 ? (
          <p className="workout-history__empty">{HISTORY_COPY.empty}</p>
        ) : (
          <ul className="workout-history__list">
            {newestFirst.map((record) => (
              <li key={record.date} className="workout-history__day">
                <span className="workout-history__date">{record.date}</span>
                <span className="workout-history__entries">{formatRecordEntries(record).join(' · ') || HISTORY_COPY.noActivity}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
