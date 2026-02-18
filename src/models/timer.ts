import type { TimerSegment } from '../types'

export interface Timer {
  segments: TimerSegment[]
}

export function createTimer(): Timer {
  return { segments: [] }
}

function openSegment(timer: Timer, now: number): void {
  timer.segments.push({ start: now, end: null })
}

export function startTimer(timer: Timer, now: number): void {
  openSegment(timer, now)
}

export function resumeTimer(timer: Timer, now: number): void {
  openSegment(timer, now)
}

function closeSegment(timer: Timer, now: number): void {
  const last = timer.segments[timer.segments.length - 1]
  if (last && last.end === null) {
    last.end = now
  }
}

export function pauseTimer(timer: Timer, now: number): void {
  closeSegment(timer, now)
}

export function completeTimer(timer: Timer, now: number): void {
  closeSegment(timer, now)
}

export function getElapsed(timer: Timer): number {
  return timer.segments.reduce((sum, seg) => {
    return sum + (seg.end !== null ? seg.end - seg.start : 0)
  }, 0)
}

export function getCurrentElapsed(timer: Timer, now: number): number {
  return timer.segments.reduce((sum, seg) => {
    return sum + (seg.end !== null ? seg.end - seg.start : now - seg.start)
  }, 0)
}
