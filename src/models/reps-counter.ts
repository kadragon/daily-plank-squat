export interface RepsCounter {
  count: number
}

export function createRepsCounter(): RepsCounter {
  return { count: 0 }
}

export function increment(counter: RepsCounter): void {
  counter.count++
}

export function decrement(counter: RepsCounter): void {
  counter.count = Math.max(0, counter.count - 1)
}

export function complete(counter: RepsCounter): number {
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

export interface SanitizeResult {
  value: number
  error: string | null
}

export function sanitizeRawInput(rawValue: string): SanitizeResult {
  if (rawValue === '') {
    return { value: 0, error: '값을 입력해 주세요' }
  }
  if (!/^\d+$/.test(rawValue)) {
    return { value: 0, error: '숫자만 입력해 주세요' }
  }
  return { value: Number(rawValue), error: null }
}
