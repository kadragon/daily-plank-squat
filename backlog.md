# Backlog

## 2-three-tab-nav: Three-tab navigation with today cards

- [ ] [FEAT] Replace the 7-tab monogram bar with 3 tabs (오늘 운동/기록/설정) showing inline-SVG icon + visible label. 오늘 운동 = progress + fatigue/recovery/overload/suspicious banners + enabled exercise cards (actual/target, completed mark, tomorrow recommendation) + Apple Health export (existing enable condition, emphasized when all enabled done). 기록 = `WorkoutStats` + per-day records. Card opens exercise detail; detail has back, exercise chips, swipe limited to enabled exercises; 오늘 운동 tab active on detail; disabling current exercise returns to list; `initialView` still works. Acceptance: tests per spec Testing Decisions → Navigation; phone-width visual check; `bun run precommit` passes. Source: `docs/design/ui-ux-navigation-controls.md` → Navigation, 오늘 운동 tab, 기록 tab.

## 3-timer-controls: Timer primary button and long-press cancel

- [ ] [FEAT] Plank/deadhang screen: circular progress ring, one large state-driven primary button (시작 green / 일시정지 orange / 재개 green), secondary 취소 requiring ~600ms long press in RUNNING/PAUSED (tap in COUNTDOWN), keyboard hold + aria description, `다음 운동 →` after COMPLETED/CANCELLED. Long-press handle in `useRef`, cleared on release/unmount with a live DOM test; mutual exclusion, wake-lock notice, swipe-ignore preserved; new color tokens on `:root`. Acceptance: tests per spec Testing Decisions → Timer; `bun run precommit` passes. Source: `docs/design/ui-ux-navigation-controls.md` → Timer screen. *(blocked by: 2-three-tab-nav)*

## 4-reps-controls: Reps tap counter

- [ ] [FEAT] Squat/pushup/dumbbell screen: large `count / target` display, tap count for direct numeric entry, large +1 and smaller −1/+5 routed through `handleDoneRepsChange`, target input removed (Settings only), bottom 완료 primary button emphasized when `count >= target`. Acceptance: tests per spec Testing Decisions → Reps; `bun run precommit` passes. Source: `docs/design/ui-ux-navigation-controls.md` → Reps screen.
