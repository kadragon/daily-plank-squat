import type { RecommendationReason } from '../types'

type RecommendationExercise = 'plank' | 'squat' | 'pushup' | 'deadhang'

const RECOMMENDATION_REASON_TEXT: Record<RecommendationReason, string> = {
  failure_streak: '최근 3일 미달성으로 회복을 위해 감량',
  missed_day_decay: '운동 쉰 날이 있어 목표 감량',
  high_fatigue_hold: '피로도 높음(>0.85)으로 목표 유지',
  success_progression: '목표 달성으로 기본 증량',
  not_met_hold: '목표 미달성으로 유지',
  streak_moderate: '7일 연속 운동으로 완만한 증량',
}

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
