# Daily Plank & Squat — PRD v1.1 TDD Plan

## Plank State Machine

- [x] Initial state is IDLE
- [x] IDLE → RUNNING on start
- [x] RUNNING → PAUSED on pause
- [x] PAUSED → RUNNING on resume
- [x] RUNNING → COMPLETED on complete
- [x] RUNNING → CANCELLED on cancel
- [x] PAUSED → CANCELLED on cancel
- [x] IDLE ignores invalid events (pause, resume, complete, cancel)
- [x] Terminal states (COMPLETED, CANCELLED) ignore all events

## Timer Model

- [x] Elapsed is 0 before start
- [x] Elapsed accumulates between start and pause via performance.now()
- [x] Elapsed preserves across pause/resume cycles
- [x] Elapsed stops after complete
- [x] getCurrentElapsed returns live value including current segment

## Fatigue Model

- [x] Returns base target with no history
- [x] Computes normalized performance ratio r_e clipped to [0, 1.5]
- [x] Computes load with over/under penalties
- [x] Computes ramp stress with clipped delta
- [x] Computes EWMA fatigue per exercise (alpha_P=0.35, alpha_S=0.40)
- [x] Computes shared fatigue F_total with weight/age factors
- [x] Computes sigmoid fatigue score with median threshold

## Target Calculation

- [x] Increases target when fatigue is low
- [x] Holds target when fatigue > 0.85
- [x] Decreases target by 10% after 3 consecutive failures
- [x] Target respects minimum floor
- [x] Target respects maximum ceiling

## Daily Record Storage

- [x] Saves record to localStorage as JSON
- [x] Loads today's record, null if absent
- [x] Loads history for last N days
- [x] Record matches PRD schema (date, plank, squat, fatigue, F_P, F_S)
- [x] Overwrites existing record for same date

## Squat Counter

- [x] Count starts at 0
- [x] Increment adds 1
- [x] Decrement subtracts 1, floor at 0
- [x] Cannot go below 0
- [x] Complete returns final count

## Integration: Plank Timer + State Machine

- [x] Start creates RUNNING and begins timing
- [x] Pause freezes elapsed
- [x] Resume continues timing
- [x] Complete records actual_sec as floor(elapsed/1000)
- [x] Cancel stores elapsed-based actual_sec and marks success=false

## Background Handling

- [x] visibilitychange hidden during RUNNING stores timestamp
- [x] visibilitychange visible restores elapsed correctly
- [x] Wake Lock requested on timer start
- [x] Wake Lock released on complete/cancel

## Alerts

- [x] Sound plays on plank goal reached
- [x] Sound plays on squat goal reached
- [x] No repeat alert if goal already reached

## UI Components

- [x] Plank view shows elapsed as MM:SS
- [x] Plank view shows start button in IDLE
- [x] Plank view shows pause/cancel in RUNNING
- [x] Plank view shows resume/cancel in PAUSED
- [x] Plank view shows result in COMPLETED
- [x] Squat view shows count and +1/-1 buttons
- [x] Squat view shows complete button
- [x] Daily summary shows targets from fatigue model
- [x] Daily summary shows completion status
- [x] App navigates between plank/squat/summary views

## Fatigue Model v1.1 Core

- [x] Uses inputs weight_kg, age, gender, base_P, base_S
- [x] Computes r_e[t] = clip(actual/max(target,1), 0, 1.5)
- [x] Computes g_e[t] = ln(1 + target/base_e)
- [x] Computes load_e[t] = g_e * (1+0.6*over) * (1+0.3*under)
- [x] Computes ramp d_e from target deltas and ramp_penalty_e = 1.2*max(0,d_e)
- [x] Updates both F_P and F_S via EWMA with (load + ramp_penalty)
- [x] Computes F_total_raw = 0.45*F_P + 0.55*F_S + 0.20*F_P*F_S
- [x] Applies clipped weight_factor and age_factor exactly per spec
- [x] Computes fatigue as sigmoid(2.2*(F_total_adj - m))
- [x] Uses rolling 14-day median m with initial default 0.9

## Plank Timer Core

- [x] Auto-completes when getElapsed() >= target_P without manual Complete 버튼 의존
- [x] Keeps internal timing in ms and persists actual_sec = floor(elapsed/1000)
- [x] On cancel, stores elapsed-based actual_sec and sets success=false
- [x] Uses requestAnimationFrame for UI ticking (not setInterval)
- [x] Integrates visibilitychange listener in app runtime
- [x] Integrates Wake Lock acquire/release in app runtime
- [x] Shows fallback guidance when Wake Lock unsupported

## Anti-Cheat & Reliability Core

- [x] Tracks hidden duration and computes inactive_time_ratio
- [x] Flags record suspicious when inactive ratio > 0.5
- [x] Includes suspicious flag in daily result/report pipeline

## Data & Flow Core

- [x] Daily squat schema uses target_reps and actual_reps keys
- [x] App load reads today target/history from storage
- [x] Completing plank+squat saves daily record and updates fatigue
- [x] Tomorrow target is computed from persisted history (not in-memory single-session)

## Safety Rules Core

- [x] If fatigue > 0.85, both plank/squat increase rates are zero
- [x] If 3-day consecutive failures, applies forced -10% rule per exercise
- [x] Shows warning when F_total_raw exceeds historical 95th percentile

## Accuracy Core

- [x] 60-second target accuracy is within ±1s in automated timing test
- [x] Background/foreground transition preserves cumulative elapsed accuracy

- [x] Squat view renders numeric Target reps and Done reps inputs (no +1/-1 controls)
- [x] Squat target input defaults to today target and accepts manual override
- [x] Done reps input clamps to integer floor with minimum 0
- [x] Target reps input clamps to integer floor with minimum 1
- [x] Complete uses entered done reps vs entered target reps to set squat success

## Add Pushups as Third Exercise

### Phase 0: Structural Refactoring

- [x] Rename SquatCounter → generic RepsCounter with title/idPrefix/exerciseName props
- [x] squat-counter.ts re-exports from reps-counter.ts (backward compat)
- [x] squat-counter.tsx is thin wrapper over RepsCounter with squat defaults
- [x] CSS class names squat-* → reps-*

### Phase 1: Types

- [x] PushupRecord type has target_reps, actual_reps, success fields
- [x] DailyRecord includes pushup: PushupRecord and F_U: number
- [x] BaseTargets includes base_U
- [x] FatigueSnapshot includes F_U
- [x] TomorrowPlan includes pushup_target_reps and F_U

### Phase 2: Storage Backwards Compatibility

- [x] Records without pushup field load with neutral pushup defaults (target=15, actual=15, success=true)
- [x] Records without F_U field load with F_U=0
- [x] Records with valid pushup field parse correctly

### Phase 3: Fatigue Model

- [x] ALPHA_U constant equals 0.45
- [x] computeSharedFatigueRaw(F_P, F_S, F_U) returns 3-exercise weighted formula
- [x] computeFatigueSeries computes F_U via pushup EWMA
- [x] computeTomorrowPlan returns base_U=15 when no history
- [x] computeTomorrowPlan increases pushup target when fatigue low
- [x] computeTomorrowPlan holds pushup target when fatigue > 0.85
- [x] hasFailureStreak detects pushup 3-day failure streak
- [x] computeTomorrowPlan decreases pushup target after failure streak

### Phase 4: Goal Alerts

- [x] GoalAlerts has onPushupProgress that fires at target
- [x] Pushup goal alert does not repeat after first trigger

### Phase 5: RepsCounter for Pushup

- [x] RepsCounter renders "Pushup Counter" heading when title="Pushup Counter"
- [x] RepsCounter uses pushup-prefixed ids when idPrefix="pushup"

### Phase 6: App Integration

- [x] App nav includes 'pushup' tab between squat and summary
- [x] App renders RepsCounter for pushup view with correct props
- [x] App save triggers only when all 3 exercises logged
- [x] App does NOT save when pushup is not logged
- [x] computeSquatSuccess (reused) computes pushup success correctly

### Phase 7: Daily Summary

- [x] DailySummary shows pushup target and completion status
- [x] DailySummary shows tomorrow pushup target

## Optional Extensions

- [x] Supports COUNTDOWN state before RUNNING
- [x] Adds vibration pattern [300,100,300] on goal reached
- [x] Adds short AudioContext beep on goal reached
- [x] Supports squat long-press continuous increment

## App Shell Redesign

- [x] Swipe model detects left swipe with enough horizontal distance
- [x] Swipe model detects right swipe with enough horizontal distance
- [x] Swipe model rejects swipes below minimum distance
- [x] Swipe model rejects swipes with excessive vertical drift
- [x] Adjacent view navigation stops at bounds (no wrap)
- [x] App bottom navigation renders icon + label tabs with one active aria-current
- [x] App supports swipe-left from plank to squat
- [x] App ignores swipe gestures that start on input/button/label
- [x] App keeps edge swipe-right on plank as no-op
- [x] App allows tap navigation fallback via bottom tabs

- [x] Executes iOS 17 Safari manual validation checklist (proxy-only: desktop Safari 26.2 on macOS 26.2; iOS simulator unavailable in this environment)

## PWA

- [x] Service worker caches assets for offline
- [x] Standalone display on iOS (meta tags present)

## iOS Notch Background Integration

- [x] iOS 노치 상단 safe-area가 app-shell 배경과 시각적으로 일치한다
- [x] iOS 상단바 관련 theme/background 색상이 앱 상단 배경 톤과 일치한다

## RPE-based Recommendation Integration

> Use per-exercise RPE input to personalize next-day targets and explain why targets changed.

- [x] Model: RPE 5~6 keeps default +5% progression
- [x] Model: RPE 1~4 applies +8% progression
- [x] Model: RPE 7~8 holds target
- [x] Model: RPE 9~10 applies -5% reduction
- [x] Model: failure streak has priority over RPE rule
- [x] Model: fatigue hold has priority over RPE rule
- [x] Model: computeTomorrowPlan returns reason code per exercise
- [x] Storage: missing rpe in legacy records loads as neutral rpe=5
- [x] Storage: invalid rpe values load as neutral rpe=5
- [x] Components: Plank/RepsCounter render RPE input
- [x] App interaction: plank/squat/pushup RPE input changes persist to today record
- [x] App rendering: workout views show recommendation reason text

## Add Deadhang as Fourth Exercise

> Add Deadhang as a fourth time-based workout, reuse Plank timer UI/model, and integrate into persistence, fatigue, summary/stats, and health export.

- [x] Types add deadhang/F_D/base_D and tomorrow deadhang fields
- [x] Storage loads missing deadhang with neutral defaults and missing F_D as 0
- [x] PlankTimer supports title/idPrefix/startDisabled props with backward-compatible defaults
- [x] Fatigue model computes ALPHA_D, 4-exercise shared fatigue, and deadhang tomorrow targets
- [x] GoalAlerts supports deadhang one-time goal trigger
- [x] Stats model aggregates and series-map deadhang actual seconds
- [x] Apple Health payload exports deadhang_actual_sec and includes deadhang in duration_sec
- [x] DailySummary renders deadhang target/status and tomorrow target
- [x] WorkoutStats renders Total deadhang and Deadhang chart
- [x] App navigation adds deadhang tab between pushup and summary
- [x] App integrates deadhang timer state, handlers, persistence, and rendering
- [x] App enforces single running timed workout (plank/deadhang start disabled while other running)
- [x] App wake lock stays active when either timed workout is RUNNING
- [x] App suspicious calculation uses max(plankInactiveRatio, deadhangInactiveRatio)
- [x] Korean locale supports deadhang-specific recommendation reason text

## Stats Page & Immediate Save

> Prevent record loss and provide visual history for plank, squat, and pushup performance.

- [x] Uses local date key (YYYY-MM-DD) for today record lookup
- [ ] Saves/updates today record when squat inputs change
- [ ] Saves/updates today record when pushup inputs change
- [ ] Saves/updates today record when plank completes or cancels
- [ ] Adds Stats tab to app navigation and swipe order
- [ ] Shows all/7d/30d range filters in stats view
- [ ] Shows cumulative totals for plank seconds, squat reps, and pushup reps
- [ ] Shows separate visual daily charts for plank, squat, and pushup
