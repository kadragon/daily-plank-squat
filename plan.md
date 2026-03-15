## 숫자 입력 개선 - sanitizeRawInput 함수

> 텍스트 입력에서 선행 0 제거, 빈값/비숫자 문자 에러 처리를 위한 순수 함수

- [x] `sanitizeRawInput("")` returns error "값을 입력해 주세요"
- [x] `sanitizeRawInput("abc")` returns error "숫자만 입력해 주세요"
- [x] `sanitizeRawInput("038")` returns `{ value: 38, error: null }`
- [x] `sanitizeRawInput("0")` returns `{ value: 0, error: null }`
- [x] `sanitizeRawInput("100")` returns `{ value: 100, error: null }`

## 숫자 입력 개선 - UI 컴포넌트

> RepsCounter와 Settings의 input을 type="text" + inputMode="numeric"으로 변경

- [x] RepsCounter renders `type="text"` with `inputMode="numeric"`
- [x] Settings target input renders `type="text"` with `inputMode="numeric"`

## 타이머 카운트다운 - Settings

> 카운트다운 시간 설정을 AppSettings에 추가

- [x] AppSettings에 countdownSec 필드 존재 (기본값 5)
- [x] parseSettings에서 countdownSec 파싱 및 범위 검증 (0~10)

## 타이머 카운트다운 - Hook

> useTimedExercise에서 startCountdown → COUNTDOWN → countdownDone 흐름 구현

- [x] handleStart가 countdownSec > 0이면 COUNTDOWN 상태로 전이
- [x] COUNTDOWN 상태에서 매 프레임 countdownMs 업데이트
- [x] countdownMs가 0 이하 도달 시 countdownDone 호출 → RUNNING 전이
- [x] COUNTDOWN 중 Cancel 시 CANCELLED 전이 (타이머 시작 안 됨)

## 타이머 카운트다운 - UI

> PlankTimer 컴포넌트에서 COUNTDOWN 상태 렌더링

- [x] PlankTimer COUNTDOWN 상태에서 카운트다운 숫자 표시
- [x] PlankTimer COUNTDOWN 상태에서 Cancel 버튼 표시

## 통합 - App 연결

> App에서 countdownSec 설정값을 useTimedExercise에 전달

- [x] Settings에 카운트다운 시간 설정 필드 렌더링
- [x] App이 countdownSec를 useTimedExercise에 전달
