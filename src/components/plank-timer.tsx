import type { PlankState } from '../types'

interface PlankTimerProps {
  title?: string
  idPrefix?: string
  elapsedMs?: number
  targetSec?: number
  state?: PlankState
  tomorrowTargetSec?: number
  tomorrowDeltaSec?: number
  recommendationReasonText?: string
  startDisabled?: boolean
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
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

export default function PlankTimer({
  title = 'Plank Timer',
  idPrefix: _idPrefix,
  elapsedMs = 0,
  targetSec = 0,
  state = 'IDLE',
  tomorrowTargetSec = 0,
  tomorrowDeltaSec = 0,
  recommendationReasonText = '',
  startDisabled = false,
  onStart,
  onPause,
  onResume,
  onCancel,
}: PlankTimerProps) {
  const progressPercent = targetSec > 0
    ? Math.min(100, Math.max(0, (elapsedMs / (targetSec * 1000)) * 100))
    : 0
  const remainingMs = Math.max(0, targetSec * 1000 - elapsedMs)
  const showRecommendation = state === 'COMPLETED' || state === 'CANCELLED'

  function renderControls() {
    switch (state) {
      case 'IDLE':
        return (
          <div className="timer-controls">
            <button type="button" className="btn btn--primary" onClick={onStart} disabled={startDisabled}>Start</button>
          </div>
        )
      case 'RUNNING':
        return (
          <div className="timer-controls">
            <button type="button" className="btn btn--primary" onClick={onPause}>Pause</button>
            <button type="button" className="btn btn--danger" onClick={onCancel}>Cancel</button>
          </div>
        )
      case 'PAUSED':
        return (
          <div className="timer-controls">
            <button type="button" className="btn btn--primary" onClick={onResume}>Resume</button>
            <button type="button" className="btn btn--danger" onClick={onCancel}>Cancel</button>
          </div>
        )
      case 'COMPLETED':
        return (
          <div className="timer-controls">
            <div>Result: {toElapsedSeconds(elapsedMs)}s</div>
          </div>
        )
      case 'CANCELLED':
        return (
          <div className="timer-controls">
            <div>Cancelled: {toElapsedSeconds(elapsedMs)}s</div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`plank-timer plank-timer--${state.toLowerCase()}`}>
      <h2>{title}</h2>
      <div className="timer-target">Target: {targetSec}s</div>
      <div className="timer-display" aria-live="polite">{formatTime(remainingMs)}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      {showRecommendation
        ? (
          <div className="recommendation-note">
            <div className="recommendation-note__target">
              내일 추천: {tomorrowTargetSec}s ({tomorrowDeltaSec > 0 ? '+' : ''}{tomorrowDeltaSec}s)
            </div>
            <div className="recommendation-note__reason">{recommendationReasonText}</div>
          </div>
        )
        : null}
      {renderControls()}
    </div>
  )
}
