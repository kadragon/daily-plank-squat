import type { DayType, RecommendationReason } from '../types'

type RecommendationExercise = 'plank' | 'squat' | 'pushup' | 'deadhang' | 'dumbbell'

const RECOMMENDATION_REASON_TEXT: Record<RecommendationReason, string> = {
  failure_streak: '최근 3일 미달성으로 회복을 위해 감량',
  missed_day_decay: '운동 쉰 날이 있어 목표 감량',
  high_fatigue_hold: '피로도 높음(>0.85)으로 목표 유지',
  weekly_cap_hold: '주간 증량 상한 초과로 목표 유지',
  success_progression: '목표 달성으로 기본 증량',
  not_met_hold: '목표 미달성으로 유지',
  streak_moderate: '7일 연속 운동으로 완만한 증량',
  recovery_day: '회복일 — 가볍게 스트레칭',
  beginner_ramp: '초심자 단계 — 안전한 점진적 증량',
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  training: '운동일',
  recovery: '회복일',
}

export const TOMORROW_LABEL = '내일'
export const RECOVERY_DAY_SUBTITLE = '회복일 — 스트레칭 & 모빌리티 루틴'

export const RECOVERY_GUIDE_ITEMS: readonly string[] = [
  '고양이-낙타 스트레칭 (10회)',
  '아기 자세 (30초 × 3세트)',
  '고관절 굴근 스트레칭 (각 30초)',
  '어깨·가슴 열기 스트레칭 (30초 × 2)',
  '가벼운 5분 걷기',
]

const DEADHANG_REASON_TEXT: Partial<Record<RecommendationReason, string>> = {
  failure_streak: '최근 3일 데드행 미달성으로 회복을 위해 감량',
  high_fatigue_hold: '데드행 피로도 높음(>0.85)으로 목표 유지',
}

export function getRecommendationReasonText(
  reason: RecommendationReason,
  exercise: RecommendationExercise = 'plank',
): string {
  if (exercise === 'deadhang') {
    return DEADHANG_REASON_TEXT[reason] ?? RECOMMENDATION_REASON_TEXT[reason]
  }
  return RECOMMENDATION_REASON_TEXT[reason]
}

export const EXERCISE_LABEL: Record<RecommendationExercise, string> = {
  plank: '플랭크',
  squat: '스쿼트',
  pushup: '푸시업',
  deadhang: '데드행',
  dumbbell: '덤벨 컬',
}

export const NAV_LABEL = {
  today: '오늘 운동',
  history: '기록',
  settings: '설정',
} as const

export const SECONDS_UNIT = '초'
export const REPS_UNIT = '회'

export function formatSeconds(value: number): string {
  return `${value}${SECONDS_UNIT}`
}

export function formatReps(value: number): string {
  return `${value}${REPS_UNIT}`
}

function formatSigned(delta: number, format: (value: number) => string): string {
  return `${delta > 0 ? '+' : ''}${format(delta)}`
}

export function formatTomorrowRecommendation(target: number, delta: number, format: (value: number) => string): string {
  return `내일 추천: ${format(target)} (${formatSigned(delta, format)})`
}

export const APP_COPY = {
  title: '데일리 트레이닝',
  subtitle: '꾸준히 운동하고, 똑똑하게 회복하세요.',
  navLabel: '주 메뉴',
  healthExportError: '단축어를 열 수 없습니다. 이 기기에서 Apple 단축어를 사용할 수 있는지 확인하세요.',
  suspiciousExportHint: '기록은 가능하지만 측정 환경 경고',
  wakeLockUnsupported: '이 기기는 화면 켜짐 유지를 지원하지 않습니다. 화면을 직접 켜 두세요.',
  wakeLockFailed: '화면 켜짐 유지를 설정하지 못했습니다. 화면을 직접 켜 두세요.',
} as const

export const SAVE_FEEDBACK = {
  saving: '저장 중...',
  saved: '방금 저장됨',
  failed: '저장하지 못했습니다. 다시 시도하세요.',
} as const

export const TIMER_COPY = {
  plankTitle: '플랭크 타이머',
  deadhangTitle: '데드행 타이머',
  start: '시작',
  pause: '일시정지',
  resume: '재개',
  cancel: '취소',
  cancelHoldHint: '길게 눌러 취소',
  next: '다음 운동',
  progressLabel: '진행률',
  result: (sec: number) => `결과: ${formatSeconds(sec)}`,
  cancelled: (sec: number) => `취소됨: ${formatSeconds(sec)}`,
  keptEarlierResult: (sec: number) => `더 좋은 이전 기록(${formatSeconds(sec)})을 유지했어요`,
} as const

export const REPS_COPY = {
  squatTitle: '스쿼트 카운터',
  pushupTitle: '푸시업 카운터',
  dumbbellTitle: '덤벨 컬 카운터',
  doneReps: '완료 횟수',
  countAriaLabel: (count: number, target: number) => `완료 횟수 ${count}회, 목표 ${target}회. 눌러서 직접 입력`,
  increment: '+1',
  incrementAriaLabel: '1회 추가',
  decrement: '−1',
  decrementAriaLabel: '1회 빼기',
  incrementFive: '+5',
  incrementFiveAriaLabel: '5회 추가',
  complete: '완료',
  completeAriaLabel: (exerciseName: string) => `${exerciseName} 완료`,
} as const

export const SETTINGS_COPY = {
  title: '설정',
  exercises: '운동',
  target: '목표',
  timer: '타이머',
  countdown: '카운트다운',
  toggleAriaLabel: (exerciseName: string) => `${exerciseName} 활성화`,
} as const

export const SUMMARY_COPY = {
  title: '오늘 운동',
  progress: (completed: number, total: number) => `${completed} / ${total} 완료`,
  progressAriaLabel: '오늘 진행률',
  exercisesAriaLabel: '오늘 운동 목록',
  actualOfTarget: (actual: string, target: string) => `${actual} / ${target}`,
  completed: '완료',
  openAriaLabel: (exerciseName: string, status: string) => `${exerciseName} 열기, ${status}`,
  fatigue: (value: string) => `피로도: ${value}`,
  noExercises: '활성화된 운동이 없습니다. 설정에서 운동을 켜세요.',
  healthExport: 'Apple 건강에 기록',
  overloadWarning: '경고: 운동 부하가 상위 5%를 넘었습니다',
  suspiciousWarning: '경고: 측정 환경이 불안정합니다',
} as const

export const DETAIL_COPY = {
  back: '목록',
  backAriaLabel: '오늘 운동 목록으로 돌아가기',
  chipsAriaLabel: '운동 선택',
} as const

export const HISTORY_COPY = {
  title: '날짜별 기록',
  empty: '아직 기록이 없습니다.',
  noActivity: '운동 기록 없음',
  entry: (exerciseName: string, value: string) => `${exerciseName} ${value}`,
} as const

export const STATS_COPY = {
  title: '운동 통계',
  empty: '아직 기록이 없습니다. 운동을 완료하면 통계가 표시됩니다.',
  rangeAll: '전체',
  range7d: '7일',
  range30d: '30일',
  total: (exerciseName: string) => `${exerciseName} 합계`,
  chartAriaLabel: (title: string) => `${title} 차트`,
} as const

export const BACKUP_COPY = {
  title: '백업',
  note: '파일은 이 기기에만 저장되며 업로드되지 않습니다.',
  export: '백업 내보내기',
  restoreFromFile: '파일에서 복원',
  fileAriaLabel: '백업 파일',
  exported: (count: number) => `기록 ${count}개를 내보냈습니다.`,
  exportedWithSkipped: (count: number, skippedDates: readonly string[]) =>
    `기록 ${count}개를 내보냈습니다. 잘못된 기록은 건너뛰었습니다: ${skippedDates.join(', ')}.`,
  reading: '파일을 읽는 중…',
  readFailed: '파일을 읽지 못했습니다 — 변경된 내용이 없습니다.',
  invalid: (error: string) => `잘못된 백업 파일입니다 — 변경된 내용이 없습니다. (${error})`,
  restoreFailed: '복원하지 못했습니다 — 기존 데이터를 유지했습니다.',
  previewAriaLabel: '복원 미리보기',
  previewSummary: (date: string, newCount: number, identicalCount: number, conflictCount: number) =>
    `${date} 백업: 새 기록 ${newCount}일, 동일 ${identicalCount}일, 충돌 ${conflictCount}일.`,
  currentChoice: (detail: string) => `현재 기록 유지 — ${detail}`,
  backupChoice: (detail: string) => `백업 기록 사용 — ${detail}`,
  includeSettings: '설정도 복원',
  apply: '복원 적용',
  cancel: '취소',
  yes: '예',
  no: '아니오',
  none: (exerciseName: string) => `${exerciseName} 없음`,
  actual: (exerciseName: string, value: string) => `${exerciseName} ${value}`,
  target: (exerciseName: string, value: string) => `${exerciseName} 목표 ${value}`,
  success: (exerciseName: string, value: string) => `${exerciseName} 성공: ${value}`,
  done: (exerciseName: string, value: string) => `${exerciseName} 완료: ${value}`,
  dayType: (value: string) => `날짜 유형: ${value}`,
  flagged: (value: string) => `측정 경고: ${value}`,
} as const
