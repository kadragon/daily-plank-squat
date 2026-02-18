import type { PlankState } from '../types'

interface PlankTimerProps {
  elapsedMs?: number
  state?: PlankState
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function PlankTimer({ elapsedMs = 0, state = 'IDLE' }: PlankTimerProps) {
  return (
    <div>
      <div>{formatElapsed(elapsedMs)}</div>
      {state === 'IDLE' ? <button type="button">Start</button> : null}
      {state === 'RUNNING' ? (
        <>
          <button type="button">Pause</button>
          <button type="button">Cancel</button>
        </>
      ) : null}
      {state === 'PAUSED' ? (
        <>
          <button type="button">Resume</button>
          <button type="button">Cancel</button>
        </>
      ) : null}
      {state === 'COMPLETED' ? <div>Result: {Math.floor(elapsedMs / 1000)}s</div> : null}
    </div>
  )
}
