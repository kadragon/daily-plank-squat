function toDateKeyPart(value: number): string {
  return value.toString().padStart(2, '0')
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = toDateKeyPart(date.getMonth() + 1)
  const day = toDateKeyPart(date.getDate())

  return `${year}-${month}-${day}`
}

export function getTodayDateKey(now = new Date()): string {
  return toLocalDateKey(now)
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const localDate = new Date(year, month - 1, day)
  localDate.setDate(localDate.getDate() + deltaDays)
  return toLocalDateKey(localDate)
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
