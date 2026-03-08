## [2026-02-19] Fix intervalId ref in SquatCounter long-press

- **Problem**: `let intervalId` inside a React component re-initializes on every render, so `clearInterval` is called with `null` after any re-render, leaking intervals.
- **Rule**: Use `useRef` for any mutable value that must survive re-renders (timers, DOM refs, flags).
- **Why**: SSR tests (`renderToStaticMarkup`) cannot cover this bug — it only manifests with live DOM interaction; note this test gap if adding long-press logic elsewhere.
