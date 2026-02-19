export interface SquatCounter {
  count: number
}

export function createSquatCounter(): SquatCounter {
  return { count: 0 }
}

export function increment(counter: SquatCounter): void {
  counter.count++
}

export function decrement(counter: SquatCounter): void {
  counter.count = Math.max(0, counter.count - 1)
}

export function complete(counter: SquatCounter): number {
  return counter.count
}

export function sanitizeDoneReps(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function sanitizeTargetReps(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}
