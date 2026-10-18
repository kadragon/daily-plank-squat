# Backlog

## Review Backlog

### PR #83 — store inactive ratio per timed exercise; re-judge never upgrades a cancelled run; note kept result on countdown cancel (2026-10-18)

- [ ] [debt] Starting a first (unlogged) timed run clears the shared `suspiciousSession` flag, and cancelling it during the countdown neither restores the flag nor persists, so the summary hides a suspicious warning the stored record still carries (source: code-review) — src/hooks/use-timed-exercise.ts:102
- [ ] [debt] Backup restore compares records with and without the optional per-exercise `inactive_time_ratio`/`cancelled` fields as different, so the same workout day saved before and after the upgrade is listed as a conflict (source: code-review) — src/storage/backup.ts:81
