import { TIMER_COPY, formatSeconds, formatTomorrowRecommendation } from '../locales/ko'
import type { PlankState } from '../types'
import LongPressButton from './long-press-button'

export const CANCEL_HOLD_MS = 600

const RING_RADIUS = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

interface PlankTimerProps {
  title?: string
  elapsedMs?: number
  targetSec?: number
  state?: PlankState
  countdownMs?: number
  tomorrowTargetSec?: number
  tomorrowDeltaSec?: number
  recommendationReasonText?: string
  startDisabled?: boolean
  cancelHoldMs?: number
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  onNext?: () => void
}

function toElapsedSeconds(elapsedMs: number): number {
  return Math.max(0, Math.floor(elapsedMs / 1000))
}

function formatTime(ms: number): string {
  const totalSeconds = toElapsedSeconds(ms)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return (
    <svg className="timer-primary__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="timer-primary__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" />
    </svg>
  )
}

export default function PlankTimer({
  title = TIMER_COPY.plankTitle,
  elapsedMs = 0,
  targetSec = 0,
  state = 'IDLE',
  countdownMs = 0,
  tomorrowTargetSec = 0,
  tomorrowDeltaSec = 0,
  recommendationReasonText = '',
  startDisabled = false,
  cancelHoldMs = CANCEL_HOLD_MS,
  onStart,
  onPause,
  onResume,
  onCancel,
  onNext,
}: PlankTimerProps) {
  const progressPercent = targetSec > 0
    ? Math.min(100, Math.max(0, (elapsedMs / (targetSec * 1000)) * 100))
    : 0
  const remainingMs = Math.max(0, targetSec * 1000 - elapsedMs)
  const showRecommendation = state === 'COMPLETED' || state === 'CANCELLED'

  function renderHoldCancel() {
    return (
      <LongPressButton
        label={TIMER_COPY.cancel}
        description={TIMER_COPY.cancelHoldHint}
        holdMs={cancelHoldMs}
        className="timer-cancel"
        onLongPress={onCancel}
      />
    )
  }

  function renderNext() {
    if (!onNext) return null
    return (
      <button type="button" className="btn btn--primary timer-next" onClick={onNext}>
        {TIMER_COPY.next}
        <span aria-hidden="true"> →</span>
      </button>
    )
  }

  function renderControls() {
    switch (state) {
      case 'IDLE':
        return (
          <div className="timer-controls">
            <button type="button" className="btn timer-primary timer-primary--go" onClick={onStart} disabled={startDisabled}>
              <PlayIcon />
              <span className="timer-primary__label">{TIMER_COPY.start}</span>
            </button>
          </div>
        )
      case 'COUNTDOWN':
        return (
          <div className="timer-controls">
            <button type="button" className="btn btn--danger timer-cancel" onClick={onCancel}>{TIMER_COPY.cancel}</button>
          </div>
        )
      case 'RUNNING':
        return (
          <div className="timer-controls">
            <button type="button" className="btn timer-primary timer-primary--pause" onClick={onPause}>
              <PauseIcon />
              <span className="timer-primary__label">{TIMER_COPY.pause}</span>
            </button>
            {renderHoldCancel()}
          </div>
        )
      case 'PAUSED':
        return (
          <div className="timer-controls">
            <button type="button" className="btn timer-primary timer-primary--go" onClick={onResume}>
              <PlayIcon />
              <span className="timer-primary__label">{TIMER_COPY.resume}</span>
            </button>
            {renderHoldCancel()}
          </div>
        )
      case 'COMPLETED':
        return (
          <div className="timer-controls">
            <div>{TIMER_COPY.result(toElapsedSeconds(elapsedMs))}</div>
            {renderNext()}
          </div>
        )
      case 'CANCELLED':
        return (
          <div className="timer-controls">
            <div>{TIMER_COPY.cancelled(toElapsedSeconds(elapsedMs))}</div>
            {renderNext()}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`plank-timer plank-timer--${state.toLowerCase()}`}>
      <h2>{title}</h2>
      <div
        className="timer-ring"
        role="progressbar"
        aria-label={TIMER_COPY.progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPercent)}
      >
        <svg className="timer-ring__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle className="timer-ring__track" cx="60" cy="60" r={RING_RADIUS} />
          <circle
            className="timer-ring__fill"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressPercent / 100)}
          />
        </svg>
        {state === 'COUNTDOWN'
          ? <div className="countdown-display" aria-live="polite">{Math.ceil(countdownMs / 1000)}</div>
          : <div className="timer-display" aria-live="polite">{formatTime(remainingMs)}</div>}
      </div>
      {showRecommendation
        ? (
          <div className="recommendation-note">
            <div className="recommendation-note__target">
              {formatTomorrowRecommendation(tomorrowTargetSec, tomorrowDeltaSec, formatSeconds)}
            </div>
            <div className="recommendation-note__reason">{recommendationReasonText}</div>
          </div>
        )
        : null}
      {renderControls()}
    </div>
  )
}
