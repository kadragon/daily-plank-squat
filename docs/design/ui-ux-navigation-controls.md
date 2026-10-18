# UI/UX Overhaul: Bottom Navigation and Workout Controls

## Problem Statement
The bottom tab bar is not intuitive. It holds up to 7 tabs (Plank, Squat, Pushup, Deadhang,
Dumbbell, Overview, Settings), and the visible element of each tab is a 2-letter monogram
(`PL`, `SQ`, `PU`, `DH`, `DB`, `OV`, `ST` — `src/components/tab-icon.tsx`) while the real label
is visually hidden (`.app-tabbar__label`, `src/index.css`). Exercises and app sections share one
flat row, and the row changes length whenever an exercise is toggled in Settings.

The workout screens have related problems:
- Timer (`plank-timer.tsx`): `Pause` and `Cancel` are equal-weight text buttons side by side, so
  a mis-tap mid-plank cancels the session.
- Reps (`reps-counter.tsx`): two free-text numeric inputs (target and done) require opening the
  keyboard during a set.
- Copy mixes English UI (`Start`, `Saved just now`, `Daily Summary`) with Korean recommendation
  and recovery text.

## Benchmarks
- Hevy: 4 bottom tabs (Home / Workout / History / Profile); exercises are chosen inside the
  workout flow, not from the tab bar. Navigation was rebuilt natively in 2026 (Liquid Glass /
  Material 3).
- Apple HIG (Tab bars): tab bars navigate between top-level sections, must not perform actions,
  and stay visible.
- Adobe Spectrum / common guidance: tab items always carry a visible label; icons supplement
  labels. 3–5 tabs is the usual range.
- Seconds (interval timer): very large time display readable at a distance; state is
  communicated by color.

## Solution
Restructure navigation into three top-level tabs — 오늘 운동 / 기록 / 설정 — with icon + visible
Korean label. Exercises move out of the tab bar into a card list on 오늘 운동; tapping a card
opens that exercise's detail screen. Timer and reps screens get large, thumb-zone primary
controls whose role, color, and icon follow state. All user-facing copy becomes Korean,
centralized in `src/locales/ko.ts`.

## User Stories
- As a user, I want labeled tabs so that I can tell what each tab does without memorizing codes.
- As a user, I want one screen that shows today's exercises, my progress, and fatigue/warnings
  so that I know what to do next at a glance.
- As a user holding a plank, I want one big button that clearly means start/pause/resume so that
  I can hit it without looking carefully.
- As a user, I want cancel to require a deliberate long press while running so that a mis-tap
  never discards my session.
- As a user, I want to finish an exercise and jump to the next one directly.
- As a user doing reps, I want to tap a big +1 (or −1 / +5) instead of typing numbers.
- As a user, I want past stats and records in a separate 기록 tab.
- As a Korean-speaking user, I want consistent Korean copy across the app.

## Implementation Decisions
### Navigation
- Tabs: `today` (오늘 운동), `history` (기록), `settings` (설정). Tab bar shows inline-SVG icon +
  visible label; no new runtime dependency. Minimum target 44×44px is kept.
- Exercise detail screens keep the existing `AppView` exercise values (`plank`, `squat`,
  `pushup`, `deadhang`, `dumbbell`). While on any detail screen, the 오늘 운동 tab is the active
  tab. A back affordance returns to the card list.
- `getActiveNavViews`/`getActiveNavItems` split into: tab items (fixed 3) and enabled exercise
  order (from settings) used by cards, chips, and swipe.
- Detail screen header shows exercise chips for enabled exercises; swipe navigation moves only
  between enabled exercises (not into history/settings).
- Toggling an exercise off while viewing its detail returns to the 오늘 운동 list.
- `App`'s `initialView` prop keeps working for exercise views (tests rely on it).

### 오늘 운동 tab (from current `DailySummary`)
- Top: today's progress (completed / enabled count) and banners for fatigue, recovery day,
  overload warning, suspicious-session notice.
- Cards per enabled exercise: name, `actual / target`, completed mark, tomorrow recommendation
  after completion.
- Apple Health export button lives here. It keeps the existing enable condition (today record
  exists) and is visually emphasized once every enabled exercise is completed.

### 기록 tab
- `WorkoutStats` plus per-day records list. Chart redesign is out of scope.

### Timer screen (plank, deadhang)
- Large time display with circular progress ring replacing the horizontal bar.
- One large circular primary button in the thumb zone:
  IDLE → 시작 ▶ (green), RUNNING → 일시정지 ⏸ (orange), PAUSED → 재개 ▶ (green).
- Secondary small 취소 button. In RUNNING (and PAUSED) cancel requires a long press (~600ms) with
  visible fill progress; in COUNTDOWN a plain tap cancels (nothing recorded yet).
- Long press is operable by keyboard (hold Space/Enter) and announced via `aria-describedby`
  ("길게 눌러 취소").
- COMPLETED/CANCELLED: result + tomorrow recommendation + `다음 운동 →` primary button that opens
  the next enabled, not-yet-completed exercise (or returns to 오늘 운동 when none remain).
- Plank/deadhang mutual exclusion and wake-lock notice are preserved.
- Long-press timer handles live in `useRef` and are cleared on release/unmount (AGENTS.md).

### Reps screen (squat, pushup, dumbbell)
- Large `count / target` display; tapping the count opens direct numeric entry.
- Large `+1` button; smaller `−1` and `+5`. All go through `handleDoneRepsChange` so sanitize,
  goal alerts, and persistence stay unchanged.
- Target input is removed from this screen; target is edited only in Settings (already
  supported via `onChangeTarget`).
- `완료` is the bottom primary button, emphasized when `count >= target`.
- `SquatCounter` wrapper may be folded into `RepsCounter` usage if it becomes redundant.

### Copy
- All visible strings (titles, buttons, save feedback, summary labels, settings labels, aria
  labels) move to `src/locales/ko.ts` in Korean. Exercise names: 플랭크, 스쿼트, 푸시업, 데드행,
  덤벨 컬.

### Styling
- Follow `DESIGN.md` tokens; add new tokens (e.g. pause orange) on `:root` instead of hard-coded
  colors.

## Testing Decisions
- `bun run precommit` (biome lint, tsc, bun test, focused-test and merge-conflict checks) must pass.
- Navigation: tests for 3 tabs with visible labels, card → detail → back, active-tab mapping on
  detail screens, swipe limited to enabled exercises, disabling the current exercise.
- Timer: interaction tests per state for primary button role/label; short tap on cancel during
  RUNNING does not cancel; long press (pointer and keyboard) cancels; long-press timer is cleared
  on early release and unmount (live DOM test — `renderToStaticMarkup` does not cover this).
- Reps: +1/−1/+5 and direct entry update count and persist; complete triggers save feedback.
- Existing tests are updated to Korean selectors without weakening assertions.
- Manual: run the app at phone width (≈375px) and check each screen visually.

## Out of Scope
- New exercises, dark-mode redesign, i18n framework, sound/vibration feedback changes,
  full-screen state background colors (Seconds-style), stats chart redesign.
- Any change to record model, storage format, fatigue/recommendation logic, or backup format.

## Further Notes
- Risk: `app.tsx` is 600 lines; navigation changes touch `renderView` heavily. Slicing should
  land navigation first, then per-screen controls, then copy cleanup, to keep diffs reviewable.
- Long-press cancel on touch must not trigger swipe navigation (`data-swipe-ignore`).
