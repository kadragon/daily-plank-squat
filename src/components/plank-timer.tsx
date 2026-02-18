import type { PlankState } from '../types'

interface PlankTimerProps {
  elapsedMs?: number
  targetSec?: number
  state?: PlankState
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

function toElapsedSeconds(elapsedMs: number): number {
  return Math.max(0, Math.floor(elapsedMs / 1000))
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = toElapsedSeconds(elapsedMs)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function PlankTimer({
  elapsedMs = 0,
  targetSec = 0,
  state = 'IDLE',
  onStart,
  onPause,
  onResume,
  onCancel,
}: PlankTimerProps) {
  const progressPercent = targetSec > 0
    ? Math.min(100, Math.max(0, (elapsedMs / (targetSec * 1000)) * 100))
    : 0

  function renderControls() {
    switch (state) {
      case 'IDLE':
        return (
          <div className="timer-controls">
            <button type="button" className="btn btn--primary" onClick={onStart}>Start</button>
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
      <h2>Plank Timer</h2>
      <div className="timer-target">Target: {targetSec}s</div>
      <div className="timer-display" aria-live="polite">{formatElapsed(elapsedMs)}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      {renderControls()}
    </div>
  )
}
