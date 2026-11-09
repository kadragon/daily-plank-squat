import { Fragment, useCallback, useMemo, useState } from 'react'
import { buildDailyStatsSeries, computeWorkoutTotals, filterRecordsByRange, type StatsRange } from '../models/stats'
import { EXERCISE_LABEL, REPS_UNIT, SECONDS_UNIT, STATS_COPY, formatSeconds } from '../locales/ko'
import type { DailyRecord } from '../types'

interface WorkoutStatsProps {
  records?: DailyRecord[]
}

interface ExerciseChartProps {
  id: string
  title: string
  unit: string
  series: { date: string, value: number | null }[]
}

const CHART_PADDING = { top: 20, right: 16, bottom: 32, left: 36 }
const CHART_HEIGHT = 160
const GRID_LINES = 4
const MAX_X_LABELS = 4

// Contiguous runs of recorded days; a missing day breaks the line.
function toSegments(series: ExerciseChartProps['series']): { index: number, value: number }[][] {
  const segments: { index: number, value: number }[][] = []
  let current: { index: number, value: number }[] = []
  series.forEach((point, index) => {
    if (point.value === null) {
      if (current.length > 0) segments.push(current)
      current = []
    } else {
      current.push({ index, value: point.value })
    }
  })
  if (current.length > 0) segments.push(current)
  return segments
}

function ExerciseChart({ id, title, unit, series }: ExerciseChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const { toX, toY, segments, xLabelStep, gridValues, innerW, innerH } = useMemo(() => {
    const maxValue = Math.max(1, ...series.map((p) => p.value ?? 0))
    const yMax = Math.ceil(maxValue * 1.15) || 1

    const innerW = 100 - CHART_PADDING.left - CHART_PADDING.right
    const innerH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

    const toX = (i: number) =>
      CHART_PADDING.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW)
    const toY = (v: number) =>
      CHART_PADDING.top + innerH - (v / yMax) * innerH

    // At most 4 date labels fit the chart width without overlapping.
    const xLabelStep = series.length <= MAX_X_LABELS ? 1 : Math.ceil((series.length - 1) / (MAX_X_LABELS - 1))

    const gridValues = [...new Set(
      Array.from({ length: GRID_LINES }, (_, i) =>
        Math.round((yMax / GRID_LINES) * (i + 1))
      )
    )]

    return { toX, toY, segments: toSegments(series), xLabelStep, gridValues, innerW, innerH }
  }, [series])

  const chartId = `chart-${id}`
  const readoutId = `${chartId}-readout`
  const lastIndex = series.length - 1

  const handlePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const idx = series.length === 1
      ? 0
      : Math.round(((xPct - CHART_PADDING.left) / innerW) * (series.length - 1))
    setSelectedIndex(Math.max(0, Math.min(series.length - 1, idx)))
  }, [series.length, innerW])

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Keep a tapped selection on touch; only a mouse hover is transient.
    if (e.pointerType === 'mouse') setSelectedIndex(null)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = (delta: number) => (current: number | null) =>
      current === null ? lastIndex : Math.max(0, Math.min(lastIndex, current + delta))
    switch (e.key) {
      case 'ArrowLeft': setSelectedIndex(step(-1)); break
      case 'ArrowRight': setSelectedIndex(step(1)); break
      case 'Home': setSelectedIndex(0); break
      case 'End': setSelectedIndex(lastIndex); break
      case 'Escape': setSelectedIndex(null); break
      default: return
    }
    e.preventDefault()
  }, [lastIndex])

  if (series.length === 0) return null

  const selected = selectedIndex === null ? null : series[selectedIndex]
  const readoutText = selected
    ? STATS_COPY.readout(
      selected.date,
      selected.value === null ? STATS_COPY.noRecord : `${selected.value}${unit}`,
    )
    : ''

  return (
    <section className="workout-stats__chart">
      <h3>{title}</h3>
      <div
        className="workout-stats__chart-control"
        role="slider"
        tabIndex={0}
        aria-label={STATS_COPY.chartAriaLabel(title)}
        aria-describedby={readoutId}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={selectedIndex ?? lastIndex}
        aria-valuetext={readoutText || undefined}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      >
        <svg
          className="workout-stats__svg-chart"
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
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

          {segments.filter((segment) => segment.length > 1).map((segment) => {
            const first = segment[0].index
            const last = segment[segment.length - 1].index
            const points = segment.map((p) => `${toX(p.index)},${toY(p.value)}`)
            return (
              <g key={`${id}-seg-${series[first].date}`}>
                <polygon
                  points={[`${toX(first)},${toY(0)}`, ...points, `${toX(last)},${toY(0)}`].join(' ')}
                  fill={`url(#${chartId}-fill)`}
                />
                <polyline
                  points={points.join(' ')}
                  fill="none" stroke="var(--primary)" strokeWidth="0.6"
                  strokeLinejoin="round" strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}

          {segments.flat().map((p) => (
            <circle
              key={`${id}-${series[p.index].date}`}
              cx={toX(p.index)} cy={toY(p.value)} r="0.8"
              fill={selectedIndex === p.index ? 'var(--secondary)' : 'var(--primary)'}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {series.map((p, i) =>
            (i % xLabelStep === 0 && lastIndex - i >= xLabelStep / 2) || i === lastIndex ? (
              <text
                key={`xl-${p.date}`}
                x={toX(i)} y={CHART_HEIGHT - 6}
                textAnchor="middle" className="workout-stats__svg-label"
              >
                {p.date.slice(5)}
              </text>
            ) : null
          )}

          {selectedIndex !== null && selected && (
            <>
              <line
                x1={toX(selectedIndex)} y1={CHART_PADDING.top}
                x2={toX(selectedIndex)} y2={CHART_PADDING.top + innerH}
                stroke="var(--chart-cursor)" strokeWidth="0.3"
                strokeDasharray={selected.value === null ? '1 1' : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {selected.value !== null && (
                <text
                  x={toX(selectedIndex)}
                  y={toY(selected.value) - 4}
                  textAnchor="middle"
                  className="workout-stats__svg-tooltip"
                >
                  {selected.value}{unit}
                </text>
              )}
            </>
          )}
        </svg>
      </div>
      <p id={readoutId} className="workout-stats__readout">{readoutText}</p>
    </section>
  )
}

export default function WorkoutStats({ records = [] }: WorkoutStatsProps) {
  const [range, setRange] = useState<StatsRange>('all')
  const filtered = useMemo(() => filterRecordsByRange(records, range), [records, range])
  const totals = useMemo(() => computeWorkoutTotals(filtered), [filtered])
  const series = useMemo(() => buildDailyStatsSeries(records, range), [records, range])

  if (filtered.length === 0) {
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

      {/* Keyed by range so a day selection never outlives the series it indexed. */}
      <Fragment key={range}>
        <ExerciseChart
          id="plank"
          title={EXERCISE_LABEL.plank}
          unit={SECONDS_UNIT}
          series={series.map((point) => ({ date: point.date, value: point.plankActualSec }))}
        />
        <ExerciseChart
          id="squat"
          title={EXERCISE_LABEL.squat}
          unit={REPS_UNIT}
          series={series.map((point) => ({ date: point.date, value: point.squatActualReps }))}
        />
        <ExerciseChart
          id="pushup"
          title={EXERCISE_LABEL.pushup}
          unit={REPS_UNIT}
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
          unit={REPS_UNIT}
          series={series.map((point) => ({ date: point.date, value: point.dumbbellActualReps }))}
        />
      </Fragment>
    </div>
  )
}
