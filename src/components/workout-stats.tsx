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

const CHART_PADDING = { top: 20, right: 16, bottom: 32, left: 36 }
const CHART_HEIGHT = 160
const GRID_LINES = 4

function ExerciseChart({ title, unit, series }: ExerciseChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (series.length === 0) return null

  const maxValue = Math.max(1, ...series.map((p) => p.value))
  const yMax = Math.ceil(maxValue * 1.15) || 1

  const innerW = 100 - CHART_PADDING.left - CHART_PADDING.right
  const innerH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

  const toX = (i: number) =>
    CHART_PADDING.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW)
  const toY = (v: number) =>
    CHART_PADDING.top + innerH - (v / yMax) * innerH

  const linePoints = series.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ')
  const areaPoints = [
    `${toX(0)},${toY(0)}`,
    ...series.map((p, i) => `${toX(i)},${toY(p.value)}`),
    `${toX(series.length - 1)},${toY(0)}`,
  ].join(' ')

  const xLabelCount = Math.min(series.length, 7)
  const xLabelStep = series.length <= 7 ? 1 : Math.ceil(series.length / xLabelCount)

  const gridValues = Array.from({ length: GRID_LINES }, (_, i) =>
    Math.round((yMax / GRID_LINES) * (i + 1))
  )

  const chartId = `chart-${title.toLowerCase()}`

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const idx = series.length === 1
      ? 0
      : Math.round(((xPct - CHART_PADDING.left) / innerW) * (series.length - 1))
    setHoverIndex(Math.max(0, Math.min(series.length - 1, idx)))
  }

  return (
    <section className="workout-stats__chart">
      <h3>{title}</h3>
      <svg
        className="workout-stats__svg-chart"
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title} chart`}
        onPointerMove={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={CHART_PADDING.left} y1={toY(v)}
              x2={100 - CHART_PADDING.right} y2={toY(v)}
              stroke="rgba(248,250,252,0.08)" strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={CHART_PADDING.left - 2} y={toY(v) + 1}
              textAnchor="end" className="workout-stats__svg-label"
            >
              {v}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill={`url(#${chartId}-fill)`} />
        <polyline
          points={linePoints}
          fill="none" stroke="var(--primary)" strokeWidth="0.6"
          strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {series.map((p, i) => (
          <circle
            key={`${title}-${p.date}`}
            cx={toX(i)} cy={toY(p.value)} r="0.8"
            fill={hoverIndex === i ? 'var(--secondary)' : 'var(--primary)'}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {series.map((p, i) =>
          i % xLabelStep === 0 || i === series.length - 1 ? (
            <text
              key={`xl-${p.date}`}
              x={toX(i)} y={CHART_HEIGHT - 6}
              textAnchor="middle" className="workout-stats__svg-label"
            >
              {p.date.slice(5)}
            </text>
          ) : null
        )}

        {hoverIndex !== null && (
          <>
            <line
              x1={toX(hoverIndex)} y1={CHART_PADDING.top}
              x2={toX(hoverIndex)} y2={CHART_PADDING.top + innerH}
              stroke="rgba(248,250,252,0.2)" strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={toX(hoverIndex)}
              y={toY(series[hoverIndex].value) - 4}
              textAnchor="middle"
              className="workout-stats__svg-tooltip"
            >
              {series[hoverIndex].value}{unit}
            </text>
          </>
        )}
      </svg>
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
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">Total dumbbell</span>
          <span className="workout-stats__total-value">{totals.dumbbellActualReps}</span>
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
      <ExerciseChart
        title="Dumbbell"
        unit=""
        series={series.map((point) => ({ date: point.date, value: point.dumbbellActualReps }))}
      />
    </div>
  )
}
