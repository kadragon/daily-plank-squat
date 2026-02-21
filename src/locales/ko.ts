import type { RecommendationReason } from '../types'

const RECOMMENDATION_REASON_TEXT: Record<RecommendationReason, string> = {
  failure_streak: '최근 3일 미달성으로 회복을 위해 감량',
  high_fatigue_hold: '피로도 높음(>0.85)으로 목표 유지',
  rpe_very_high_reduce: '오늘 RPE 높음(9~10)으로 내일 소폭 감량',
  rpe_high_hold: '오늘 RPE 높음(7~8)으로 내일 목표 유지',
  rpe_low_boost: '오늘 RPE 낮음(1~4)으로 내일 소폭 증량',
  neutral_progression: '중립 강도(5~6)로 기본 증량',
}

export function getRecommendationReasonText(reason: RecommendationReason): string {
  return RECOMMENDATION_REASON_TEXT[reason]
}
