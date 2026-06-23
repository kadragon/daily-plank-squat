# Tasks

## Backlog

### Out-of-scope from PR #52 review (dev-review-cycle)

- **[P3] `src/components/tab-icon.tsx:18` `if (!monogram) return null` is unreachable** under `MONOGRAM: Record<AppView, string>`. Kept intentionally as defensive parity with the original `default: return null` runtime contract for non-typed callers. Revisit only if the call site is proven exhaustive at runtime.
