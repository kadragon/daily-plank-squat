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
