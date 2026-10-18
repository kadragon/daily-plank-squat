# Backlog

## Review Backlog

### PR #81 — keep earlier timed result on rerun; resolve reps draft (2026-10-18)

- [ ] [debt] After a rerun that is not better, the timer screen still shows the rerun's cancelled time and recommendation while the today card and record keep the earlier result; nothing tells the user the earlier result was kept (source: code-review) — src/hooks/use-timed-exercise.ts:102
- [ ] [debt] After a reload the logged-run visibility tracker starts empty, so any later persist recomputes `flag_suspicious` as false for a restored timed result (source: code-review) — src/hooks/use-timed-exercise.ts:60
- [ ] [debt] A logged timed `success` is not re-judged when the target changes, so the record can save a raised `target_sec` with an earlier `success: true` (source: code-review) — src/app.tsx:306
