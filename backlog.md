# Backlog

## Review Backlog

### PR #82 — tell user when rerun keeps earlier result; restore inactive ratio; re-judge on target change (2026-10-18)

- [ ] [debt] The record stores only the day's max `inactive_time_ratio`, so after a reload with both timed exercises logged each is seeded with it and a clean, better rerun of one cannot clear `flag_suspicious`; store the ratio per exercise (source: code-review, codex) — src/hooks/use-timed-exercise.ts:67
- [ ] [debt] Re-judging a logged result against a lowered target turns a cancelled run into a success while the timer screen still says 취소됨 (and reloads as COMPLETED); decide whether re-judging may upgrade a cancelled run (source: code-review) — src/hooks/use-timed-exercise.ts:208
