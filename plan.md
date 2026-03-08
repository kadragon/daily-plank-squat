# Daily Plank & Squat — PRD v1.1 TDD Plan

## RPE 시스템 제거 및 성과 기반 추천 시스템 전환

> RPE 기반 추천을 제거하고, 성공/실패 + 연속일수 기반의 단순한 추천 시스템으로 교체.

### Phase 1: 추천 로직 교체

- [x] `RecommendationReason`에 `success_progression`, `not_met_hold`, `streak_moderate` 추가, RPE reason 4개 제거
- [x] `computeConsecutiveDays` — 빈 배열이면 0 반환
- [x] `computeConsecutiveDays` — currentDate에 레코드 1개만 있으면 1 반환
- [x] `computeConsecutiveDays` — 3일 연속 레코드면 3 반환
- [x] `computeConsecutiveDays` — 중간에 빈 날 있으면 거기서 끊김
- [x] `computeConsecutiveDays` — currentDate 이후 레코드는 무시
- [x] `computeNextTargetValue` success=true, consecutiveDays < 7 → +5%, reason `success_progression`
- [x] `computeNextTargetValue` success=false → 유지, reason `not_met_hold`
- [x] `computeNextTargetValue` success=true, consecutiveDays >= 7 → +3%, reason `streak_moderate`
- [x] failure_streak가 success_progression보다 우선
- [x] missed_day_decay가 success_progression보다 우선
- [x] high_fatigue_hold가 success_progression보다 우선
- [x] `computeTomorrowPlan`이 새 로직 사용 (rpe 제거)
- [x] `getRpeAdjustment` 함수 및 RPE 상수 삭제, 새 상수 추가

### Phase 2: 타입에서 RPE 필드 제거

- [x] `ExerciseRecord`, `SquatRecord`, `PushupRecord`에서 `rpe` 제거
- [x] `RpeUnlockRecord` 삭제, `DailyRecord`에서 `rpe_unlock` 제거
- [x] 모든 컴파일 오류 수정

### Phase 3: RPE 유틸 및 스토리지 정리

- [x] `rpe.ts`, `rpe.test.ts` 삭제
- [x] 스토리지에서 RPE 관련 코드 제거 (rpe 무시, rpe_unlock 제거)
- [x] RPE 관련 스토리지 테스트 업데이트

### Phase 4: 로케일 업데이트

- [x] RPE 텍스트 제거, 새 텍스트 추가

### Phase 5: UI 컴포넌트에서 RPE 제거 + 추천 조건부 표시

- [x] PlankTimer: RPE props/UI 제거, 조건부 추천 표시
- [x] RepsCounter: RPE props/UI 제거, showRecommendation prop 추가
- [x] SquatCounter: RPE props 제거, showRecommendation 전달
- [x] 관련 테스트 업데이트

### Phase 6: App 통합

- [x] RPE 상태/핸들러 전면 제거
- [x] 운동별 완료 추적 및 추천 조건부 표시
- [x] App 테스트 업데이트

### Phase 7: 최종 정리

- [x] 호환 래퍼에서 rpe/rpe_unlock 제거
- [x] 전체 테스트 통과 확인
- [x] 미사용 import 정리
