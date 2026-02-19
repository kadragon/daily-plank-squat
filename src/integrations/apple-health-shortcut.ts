import type { DailyRecord, HealthShortcutPayload } from '../types'

const REP_DURATION_SECONDS = 2

export function buildHealthPayload(todayRecord: DailyRecord): HealthShortcutPayload {
  return {
    schema_version: '1.0',
    date: todayRecord.date,
    workout_type: 'Functional Strength Training',
    duration_sec: todayRecord.plank.actual_sec + REP_DURATION_SECONDS * (todayRecord.squat.actual_reps + todayRecord.pushup.actual_reps),
    plank_actual_sec: todayRecord.plank.actual_sec,
    squat_actual_reps: todayRecord.squat.actual_reps,
    pushup_actual_reps: todayRecord.pushup.actual_reps,
    fatigue: todayRecord.fatigue,
    flag_suspicious: todayRecord.flag_suspicious,
    source: 'daily-plank-squat-web',
  }
}

export function buildShortcutRunUrl(payload: HealthShortcutPayload, shortcutName: string): string {
  return `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(shortcutName)}&input=text&text=${encodeURIComponent(JSON.stringify(payload))}`
}
