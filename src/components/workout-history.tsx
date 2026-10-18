import { EXERCISE_LABEL, HISTORY_COPY, formatReps, formatSeconds } from '../locales/ko'
import type { DailyRecord } from '../types'
import WorkoutStats from './workout-stats'

interface WorkoutHistoryProps {
  records?: DailyRecord[]
}

function formatRecordEntries(record: DailyRecord): string[] {
  const entries = [
    HISTORY_COPY.entry(EXERCISE_LABEL.plank, formatSeconds(record.plank.actual_sec)),
    HISTORY_COPY.entry(EXERCISE_LABEL.squat, formatReps(record.squat.actual_reps)),
    HISTORY_COPY.entry(EXERCISE_LABEL.pushup, formatReps(record.pushup.actual_reps)),
    HISTORY_COPY.entry(EXERCISE_LABEL.deadhang, formatSeconds(record.deadhang.actual_sec)),
  ]
  if (record.dumbbell) {
    entries.push(HISTORY_COPY.entry(EXERCISE_LABEL.dumbbell, formatReps(record.dumbbell.actual_reps)))
  }
  return entries
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
                <span className="workout-history__entries">{formatRecordEntries(record).join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
