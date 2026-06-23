# Tasks

## Backlog

### Out-of-scope from PR #52 review (dev-review-cycle)

- **[P3] `public/favicon.svg` missing `<title>` — latent CI break.** biome `noSvgWithoutTitle` does not flag it under the pinned `2.4.16`, but it errors under `2.5.0`. A dependabot biome bump will turn `bun run lint` red. Add a `<title>` element to the SVG (or scope-disable the rule for `public/`). Pre-existing on base `d2e0428`; not introduced by PR #52.
- **[P3] `src/components/tab-icon.tsx:18` `if (!monogram) return null` is unreachable** under `MONOGRAM: Record<AppView, string>`. Kept intentionally as defensive parity with the original `default: return null` runtime contract for non-typed callers. Revisit only if the call site is proven exhaustive at runtime.
