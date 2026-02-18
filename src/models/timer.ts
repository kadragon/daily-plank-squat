import type { TimerSegment } from '../types'

export interface Timer {
  segments: TimerSegment[]
}

export function createTimer(): Timer {
  return { segments: [] }
}
