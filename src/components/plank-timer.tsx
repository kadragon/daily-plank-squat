import type { PlankState } from '../types'

interface PlankTimerProps {
  elapsedMs?: number
  state?: PlankState
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  onComplete?: () => void
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
  state = 'IDLE',
  onStart,
  onPause,
  onResume,
  onCancel,
  onComplete,
}: PlankTimerProps) {
  function renderControls() {
    switch (state) {
      case 'IDLE':
        return <button type="button" onClick={onStart}>Start</button>
      case 'RUNNING':
        return (
          <>
            <button type="button" onClick={onPause}>Pause</button>
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" onClick={onComplete}>Complete</button>
          </>
        )
      case 'PAUSED':
        return (
          <>
            <button type="button" onClick={onResume}>Resume</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </>
        )
      case 'COMPLETED':
        return <div>Result: {toElapsedSeconds(elapsedMs)}s</div>
      default:
        return null
    }
  }

  return (
    <div>
      <div>{formatElapsed(elapsedMs)}</div>
      {renderControls()}
    </div>
  )
}
