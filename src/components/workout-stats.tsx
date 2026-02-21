import { useMemo, useState } from 'react'
import { buildDailyStatsSeries, computeWorkoutTotals, filterRecordsByRange, type StatsRange } from '../models/stats'
import type { DailyRecord } from '../types'

interface WorkoutStatsProps {
  records?: DailyRecord[]
}

interface ExerciseChartProps {
  title: string
  unit: string
  series: { date: string, value: number }[]
}

function ExerciseChart({ title, unit, series }: ExerciseChartProps) {
  const maxValue = Math.max(1, ...series.map((point) => point.value))

  return (
    <section className="workout-stats__chart">
      <h3>{title}</h3>
      <div className="workout-stats__chart-grid" role="img" aria-label={`${title} chart`}>
        {series.map((point) => (
          <div className="workout-stats__chart-row" key={`${title}-${point.date}`}>
            <span className="workout-stats__chart-date">{point.date.slice(5)}</span>
            <div className="workout-stats__chart-track">
              <div
                className="workout-stats__chart-bar"
                style={{ width: `${Math.max(4, (point.value / maxValue) * 100)}%` }}
              />
            </div>
            <span className="workout-stats__chart-value">{point.value}{unit}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function WorkoutStats({ records = [] }: WorkoutStatsProps) {
  const [range, setRange] = useState<StatsRange>('all')
  const filtered = useMemo(() => filterRecordsByRange(records, range), [records, range])
  const totals = useMemo(() => computeWorkoutTotals(filtered), [filtered])
  const series = useMemo(() => buildDailyStatsSeries(filtered), [filtered])

  if (series.length === 0) {
    return (
      <div className="workout-stats">
        <h2>Workout Stats</h2>
        <p className="workout-stats__empty">No records yet. Complete a workout to see stats.</p>
      </div>
    )
  }

  return (
    <div className="workout-stats">
      <h2>Workout Stats</h2>
      <div className="workout-stats__range">
        <button
          type="button"
          className={`workout-stats__range-btn${range === 'all' ? ' workout-stats__range-btn--active' : ''}`}
          onClick={() => setRange('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`workout-stats__range-btn${range === '7d' ? ' workout-stats__range-btn--active' : ''}`}
          onClick={() => setRange('7d')}
        >
          7D
        </button>
        <button
          type="button"
          className={`workout-stats__range-btn${range === '30d' ? ' workout-stats__range-btn--active' : ''}`}
          onClick={() => setRange('30d')}
        >
          30D
        </button>
      </div>

      <section className="workout-stats__totals">
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">Total plank</span>
          <span className="workout-stats__total-value">{totals.plankActualSec}s</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">Total squat</span>
          <span className="workout-stats__total-value">{totals.squatActualReps}</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">Total pushup</span>
          <span className="workout-stats__total-value">{totals.pushupActualReps}</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">Total deadhang</span>
          <span className="workout-stats__total-value">{totals.deadhangActualSec}s</span>
        </div>
      </section>

      <ExerciseChart
        title="Plank"
        unit="s"
        series={series.map((point) => ({ date: point.date, value: point.plankActualSec }))}
      />
      <ExerciseChart
        title="Squat"
        unit=""
        series={series.map((point) => ({ date: point.date, value: point.squatActualReps }))}
      />
      <ExerciseChart
        title="Pushup"
        unit=""
        series={series.map((point) => ({ date: point.date, value: point.pushupActualReps }))}
      />
      <ExerciseChart
        title="Deadhang"
        unit="s"
        series={series.map((point) => ({ date: point.date, value: point.deadhangActualSec }))}
      />
    </div>
  )
}
