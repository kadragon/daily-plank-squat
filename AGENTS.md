## [2026-04-07] React mutable timer handles

- Use `useRef` for mutable timer handles or flags that must survive React re-renders.
- `renderToStaticMarkup` tests do not catch live DOM timer leaks or stale cleanup handles; cover that gap explicitly when adding interaction-driven timer logic.
