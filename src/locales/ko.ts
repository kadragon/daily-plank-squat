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
  failure_streak: '최근 3일 Deadhang 미달성으로 회복을 위해 감량',
  high_fatigue_hold: 'Deadhang 피로도 높음(>0.85)으로 목표 유지',
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
