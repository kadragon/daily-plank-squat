# Daily Plank & Squat — TDD Plan

## Plank State Machine

- [ ] Initial state is IDLE
- [ ] IDLE → RUNNING on start
- [ ] RUNNING → PAUSED on pause
- [ ] PAUSED → RUNNING on resume
- [ ] RUNNING → COMPLETED on complete
- [ ] RUNNING → CANCELLED on cancel
- [ ] PAUSED → CANCELLED on cancel
- [ ] IDLE ignores invalid events (pause, resume, complete, cancel)
- [ ] Terminal states (COMPLETED, CANCELLED) ignore all events

## Timer Model

- [ ] Elapsed is 0 before start
- [ ] Elapsed accumulates between start and pause via performance.now()
- [ ] Elapsed preserves across pause/resume cycles
- [ ] Elapsed stops after complete
- [ ] getCurrentElapsed returns live value including current segment

## Fatigue Model

- [ ] Returns base target with no history
- [ ] Computes normalized performance ratio r_e clipped to [0, 1.5]
- [ ] Computes load with over/under penalties
- [ ] Computes ramp stress with clipped delta
- [ ] Computes EWMA fatigue per exercise (alpha_P=0.35, alpha_S=0.40)
- [ ] Computes shared fatigue F_total with weight/age factors
- [ ] Computes sigmoid fatigue score with median threshold

## Target Calculation

- [ ] Increases target when fatigue is low
- [ ] Holds target when fatigue > 0.85
- [ ] Decreases target by 10% after 3 consecutive failures
- [ ] Target respects minimum floor
- [ ] Target respects maximum ceiling

## Daily Record Storage

- [ ] Saves record to localStorage as JSON
- [ ] Loads today's record, null if absent
- [ ] Loads history for last N days
- [ ] Record matches PRD schema (date, plank, squat, fatigue, F_P, F_S)
- [ ] Overwrites existing record for same date

## Squat Counter

- [ ] Count starts at 0
- [ ] Increment adds 1
- [ ] Decrement subtracts 1, floor at 0
- [ ] Cannot go below 0
- [ ] Complete returns final count

## Integration: Plank Timer + State Machine

- [ ] Start creates RUNNING and begins timing
- [ ] Pause freezes elapsed
- [ ] Resume continues timing
- [ ] Complete records actual_sec as floor(elapsed/1000)
- [ ] Cancel marks success=false

## Background Handling

- [ ] visibilitychange hidden during RUNNING stores timestamp
- [ ] visibilitychange visible restores elapsed correctly
- [ ] Wake Lock requested on timer start
- [ ] Wake Lock released on complete/cancel

## Alerts

- [ ] Sound plays on plank goal reached
- [ ] Sound plays on squat goal reached
- [ ] No repeat alert if goal already reached

## UI Components

- [ ] Plank view shows elapsed as MM:SS
- [ ] Plank view shows start button in IDLE
- [ ] Plank view shows pause/cancel in RUNNING
- [ ] Plank view shows resume/cancel in PAUSED
- [ ] Plank view shows result in COMPLETED
- [ ] Squat view shows count and +1/-1 buttons
- [ ] Squat view shows complete button
- [ ] Daily summary shows targets from fatigue model
- [ ] Daily summary shows completion status
- [ ] App navigates between plank/squat/summary views

## PWA

- [ ] Service worker caches assets for offline
- [ ] Standalone display on iOS (meta tags present)
