# Integration base rule (post INTEGRATION-CLOSURE-01)

## Problem

Feature work merged in review on PR **A** may not exist on `STAGE`. A new PR **B** branched from `STAGE` will ship without that work and can look like a regression in preview.

## Rule

Before creating a feature branch from `STAGE`:

1. List open PRs whose functionality your work **depends on** (UI composition, shared libs, schema, i18n).
2. If dependency PRs are **not** on `STAGE`, choose explicitly:
   - **Integration base:** branch from the dependency PR head (or a dedicated integration branch), **or**
   - **Predecessor first:** merge/close the dependency PR before starting.
3. Never assume `STAGE` contains accepted-but-unmerged work.

## CI guardrails

- `components/admin/dashboard/__tests__/dashboard-06-composition.test.ts` — personal dashboard composition on `ClubDashboardView`.
- `app/(admin)/dashboard/__tests__/integration-closure-01-personal-dashboard-route.test.ts` — `/dashboard` route uses `ClubDashboardView`.
- Planning operational tests under `components/admin/shared/planning-editor/__tests__/` and `lib/planning/__tests__/`.

## Reference

Full forensics: `docs/integration/INTEGRATION-CLOSURE-01-DASHBOARD-PLANNING.md`.
