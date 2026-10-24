# SCE-FINANCE-04C-07 — Hardening, Concurrency & Release Closure

| Field | Value |
| --- | --- |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |
| **PR** | #904 → **STAGE** |
| **Status** | **FIN-04C COMPLETE** — PO UAT **PASS**, **MERGED TO STAGE** (PR **#904**) |
| **Depends on** | FIN-04C-01 … FIN-04C-06R2 (PO UAT **PASS**) |

## Purpose

FIN-04C-07 proves that Rolling Forecast & Reforecasting is **safe enough to close and merge** without redesigning accepted FIN-04C UX and without starting FIN-04D.

## Locked product principles

- **Living current forecast:** the organisation-owned management view remains editable until the next formal checkpoint.
- **Formal reforecast:** creates immutable governance history without freezing future editing.
- **SCE UX:** *Conclusions first. Details on demand.* (FIN-04C-05…06 clarity architecture remains unchanged.)

Canonical architecture string:

> The current forecast is a living management view. Formal reforecasts create governance history.

## State machine (verified)

| Transition | Behaviour |
| --- | --- |
| Manual edits on CURRENT | Same version id; in-place line mutation |
| Formal reforecast | Prior CURRENT → SUPERSEDED; new CURRENT with full line snapshot |
| Automatic forecast adoption | Explicit formal revision; `AUTOMATIC_FORECAST_ADOPTION` provenance |
| Scenario | **Out of scope** — `scenarioKey` remains null for FIN-04C revisions |

**Canonical current resolution:** `FinanceForecast.currentVersionId` only — never `MAX(versionNumber)`.

## Concurrency & idempotency

| Case | Outcome |
| --- | --- |
| Two formalizations with same `expectedCurrentForecastVersionId` | First succeeds; second → `FINANCE_FORECAST_REVISION_STALE_CURRENT` |
| Duplicate persist after success | Stale guard; no second CURRENT |
| Adoption with stale source forecast version | `FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED` |
| Formalization after adoption moved pointer | Stale expected current → 409 |
| Duplicate adoption on stale inputs | Blocked; single adoption row |

## Residual boundary (documented, not “solved”)

FIN-04C-03 explicitly scoped **no line-level optimistic concurrency token** for ordinary manual edits. Concurrent in-place edits on the same CURRENT version id remain last-write-wins at the line upsert boundary. Formal reforecast snapshots the **committed CURRENT lines** read inside the revision transaction; this package does **not** introduce a draft/working-version model.

## Automated coverage added in 07

- `lib/finance/__tests__/finance-04c-07-hardening-and-release-closure.test.ts`
- Architecture facts: `ROLLING_FORECAST_FIN_04C_07_RELEASE_CLOSURE` in `rolling-forecast-architecture-contract.ts`
- STAGE read-only inventory: `scripts/sce-finance-04c-07-stage-readonly-integrity.ts`

## Database

No new migration in FIN-04C-07. Existing FIN-04C migrations remain:

- `20261024120000_sce_finance_04c_02_forecast_revision_lifecycle`
- `20261024140000_sce_finance_04c_06_revision_reason`

## Binary controls

No new binary checkboxes for FIN-04C workspace surfaces; progressive disclosure uses buttons with `aria-expanded`.

## Explicit non-goals (FIN-04D+)

Scenarios, timed cash forecasting, FIN-05 reporting, finance-wide visual redesign, merge of PR #904 — all **out of scope** for this package.

## Merge authorization

Michael performs final PO UAT and authorizes merge separately. Cursor does **not** merge PR #904 or modify STAGE directly.
