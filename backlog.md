# Backlog

## Review Backlog

### PR #78 — three-tab navigation with today exercise cards (2026-10-18)

- [ ] [debt] Restarting a timed exercise resets `result.actualSec` to 0, so the today card (and saved record) drop an earlier completed result while the new run is in progress or after a cancel (source: code-review) — src/hooks/use-timed-exercise.ts

### PR #80 — reps screen tap counter (2026-10-18)

- [ ] [debt] While direct entry is open, +1/−1/+5 and 완료 act on the old count; if a tap does not blur the input (unverified on iOS Safari), a later blur commits the stale draft over the button change — commit or close the draft before adjust/complete (source: code-review) — src/components/reps-counter.tsx:40 (introduced here)
