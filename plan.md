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

- [ ] Squat view renders numeric Target reps and Done reps inputs (no +1/-1 controls)
- [ ] Squat target input defaults to today target and accepts manual override
- [ ] Done reps input clamps to integer floor with minimum 0
- [ ] Target reps input clamps to integer floor with minimum 1
- [ ] Complete uses entered done reps vs entered target reps to set squat success

## Optional Extensions

- [ ] Supports COUNTDOWN state before RUNNING
- [x] Adds vibration pattern [300,100,300] on goal reached
- [x] Adds short AudioContext beep on goal reached
- [x] Supports squat long-press continuous increment
- [ ] Executes iOS 17 Safari manual validation checklist

## PWA

- [x] Service worker caches assets for offline
- [x] Standalone display on iOS (meta tags present)
