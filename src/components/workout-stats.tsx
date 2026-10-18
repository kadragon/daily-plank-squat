import { useCallback, useMemo, useState } from 'react'
import { buildDailyStatsSeries, computeWorkoutTotals, filterRecordsByRange, type StatsRange } from '../models/stats'
import { EXERCISE_LABEL, SECONDS_UNIT, STATS_COPY, formatSeconds } from '../locales/ko'
import type { DailyRecord } from '../types'

interface WorkoutStatsProps {
  records?: DailyRecord[]
}

interface ExerciseChartProps {
  id: string
  title: string
  unit: string
  series: { date: string, value: number }[]
}

const CHART_PADDING = { top: 20, right: 16, bottom: 32, left: 36 }
const CHART_HEIGHT = 160
const GRID_LINES = 4

function ExerciseChart({ id, title, unit, series }: ExerciseChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { toX, toY, linePoints, areaPoints, xLabelStep, gridValues, innerW, innerH } = useMemo(() => {
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

    const gridValues = [...new Set(
      Array.from({ length: GRID_LINES }, (_, i) =>
        Math.round((yMax / GRID_LINES) * (i + 1))
      )
    )]

    return { toX, toY, linePoints, areaPoints, xLabelStep, gridValues, innerW, innerH }
  }, [series])

  const chartId = `chart-${id}`

  const handlePointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const idx = series.length === 1
      ? 0
      : Math.round(((xPct - CHART_PADDING.left) / innerW) * (series.length - 1))
    setHoverIndex(Math.max(0, Math.min(series.length - 1, idx)))
  }, [series.length, innerW])

  if (series.length === 0) return null

  return (
    <section className="workout-stats__chart">
      <h3>{title}</h3>
      <svg
        className="workout-stats__svg-chart"
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={STATS_COPY.chartAriaLabel(title)}
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
              stroke="var(--chart-grid)" strokeWidth="0.3"
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
            key={`${id}-${p.date}`}
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
              stroke="var(--chart-cursor)" strokeWidth="0.3"
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
        <h2>{STATS_COPY.title}</h2>
        <p className="workout-stats__empty">{STATS_COPY.empty}</p>
      </div>
    )
  }

  return (
    <div className="workout-stats">
      <h2>{STATS_COPY.title}</h2>
      <div className="workout-stats__range">
        <button
          type="button"
          className={`workout-stats__range-btn${range === 'all' ? ' workout-stats__range-btn--active' : ''}`}
          onClick={() => setRange('all')}
        >
          {STATS_COPY.rangeAll}
        </button>
        <button
          type="button"
          className={`workout-stats__range-btn${range === '7d' ? ' workout-stats__range-btn--active' : ''}`}
          onClick={() => setRange('7d')}
        >
          {STATS_COPY.range7d}
        </button>
        <button
          type="button"
          className={`workout-stats__range-btn${range === '30d' ? ' workout-stats__range-btn--active' : ''}`}
          onClick={() => setRange('30d')}
        >
          {STATS_COPY.range30d}
        </button>
      </div>

      <section className="workout-stats__totals">
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">{STATS_COPY.total(EXERCISE_LABEL.plank)}</span>
          <span className="workout-stats__total-value">{formatSeconds(totals.plankActualSec)}</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">{STATS_COPY.total(EXERCISE_LABEL.squat)}</span>
          <span className="workout-stats__total-value">{totals.squatActualReps}</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">{STATS_COPY.total(EXERCISE_LABEL.pushup)}</span>
          <span className="workout-stats__total-value">{totals.pushupActualReps}</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">{STATS_COPY.total(EXERCISE_LABEL.deadhang)}</span>
          <span className="workout-stats__total-value">{formatSeconds(totals.deadhangActualSec)}</span>
        </div>
        <div className="workout-stats__total-card">
          <span className="workout-stats__total-label">{STATS_COPY.total(EXERCISE_LABEL.dumbbell)}</span>
          <span className="workout-stats__total-value">{totals.dumbbellActualReps}</span>
        </div>
      </section>

      <ExerciseChart
        id="plank"
        title={EXERCISE_LABEL.plank}
        unit={SECONDS_UNIT}
        series={series.map((point) => ({ date: point.date, value: point.plankActualSec }))}
      />
      <ExerciseChart
        id="squat"
        title={EXERCISE_LABEL.squat}
        unit=""
        series={series.map((point) => ({ date: point.date, value: point.squatActualReps }))}
      />
      <ExerciseChart
        id="pushup"
        title={EXERCISE_LABEL.pushup}
        unit=""
        series={series.map((point) => ({ date: point.date, value: point.pushupActualReps }))}
      />
      <ExerciseChart
        id="deadhang"
        title={EXERCISE_LABEL.deadhang}
        unit={SECONDS_UNIT}
        series={series.map((point) => ({ date: point.date, value: point.deadhangActualSec }))}
      />
      <ExerciseChart
        id="dumbbell"
        title={EXERCISE_LABEL.dumbbell}
        unit=""
        series={series.map((point) => ({ date: point.date, value: point.dumbbellActualReps }))}
      />
    </div>
  )
}
