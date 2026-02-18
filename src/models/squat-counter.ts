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
