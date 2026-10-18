# Backlog

## 4-reps-controls: Reps tap counter

- [ ] [FEAT] Squat/pushup/dumbbell screen: large `count / target` display, tap count for direct numeric entry, large +1 and smaller −1/+5 routed through `handleDoneRepsChange`, target input removed (Settings only), bottom 완료 primary button emphasized when `count >= target`. Acceptance: tests per spec Testing Decisions → Reps; `bun run precommit` passes. Source: `docs/design/ui-ux-navigation-controls.md` → Reps screen.

## Review Backlog

### PR #78 — three-tab navigation with today exercise cards (2026-10-18)

- [ ] [debt] Restarting a timed exercise resets `result.actualSec` to 0, so the today card (and saved record) drop an earlier completed result while the new run is in progress or after a cancel (source: code-review) — src/hooks/use-timed-exercise.ts
