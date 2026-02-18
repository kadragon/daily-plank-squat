export interface SquatCounter {
  count: number
}

export function createSquatCounter(): SquatCounter {
  return { count: 0 }
}
