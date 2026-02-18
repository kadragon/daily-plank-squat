import type { DailyRecord } from '../types'

export function saveRecord(_record: DailyRecord): void {}

export function loadTodayRecord(): DailyRecord | null {
  return null
}

export function loadHistory(_days: number): DailyRecord[] {
  return []
}
