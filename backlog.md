# Backlog

## Review Backlog

### PR #75 — local JSON backup and restore (2026-10-17)

- [ ] [debt] Ignore stale file reads when a second backup file is picked before the first finishes reading; block confirm while reading (source: codex) — src/components/backup-restore.tsx:55 (introduced here)
- [ ] [debt] Conflict choices only summarize plank/squat/pushup; show the exercises that actually differ (deadhang, dumbbell, completion flags) (source: codex) — src/components/backup-restore.tsx:36 (introduced here)
- [ ] [debt] Catch `file.text()` rejection in restore and show "could not read file" instead of an unhandled rejection (source: code-review, low confidence) — src/components/backup-restore.tsx:50 (introduced here)
