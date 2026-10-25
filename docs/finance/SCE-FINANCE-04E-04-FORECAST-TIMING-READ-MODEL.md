# SCE-FINANCE-04E-04 — Forecast timing read model & intelligence

| Field | Value |
| --- | --- |
| **Package** | FIN-04E-04 query / read model |
| **Status** | **COMPLETE** (this branch) |
| **Branch** | `cursor/sce-finance-04e-forecast-timing-f9d6` |
| **Code** | `lib/finance/forecast/finance-forecast-timing-read-model.ts`, `build-forecast-timing-intelligence.ts`, `lib/finance/services/finance-forecast-timing-query-service.ts` |

## Purpose

Presentation-neutral intelligence layer for **Forecast Timing**. Sits above Current Forecast, Actual through cutoff, persisted `FinanceExpectedFinancialEvent`, FIN-04E-02 reconciliation, and FIN-04E-03 services — consumed by workspace UX ([`SCE-FINANCE-04E-05-FORECAST-TIMING-WORKSPACE-UX.md`](./SCE-FINANCE-04E-05-FORECAST-TIMING-WORKSPACE-UX.md)) and visual timing ([`SCE-FINANCE-04E-07-VISUAL-TIMING-INTELLIGENCE.md`](./SCE-FINANCE-04E-07-VISUAL-TIMING-INTELLIGENCE.md)).

Answers (for future UX, not implemented here):

- How much remaining forecast is timed vs unscheduled?
- Is timing overallocated or ambiguous at the Actual cutoff?
- Which expected movements are next?
- Which accounts need investigation?

## Read model family

| Read model | Role |
| --- | --- |
| `FinanceForecastTimingOverviewReadModel` | Finance year timing intelligence, aggregates, interpretation, exceptions, upcoming slice |
| `FinanceForecastTimingAccountReadModel` | Per-account reconciliation + ranking + next event pointer |
| `FinanceExpectedFinancialEventReadModel` | Event detail with account type, temporal position, source presentation |
| `FinanceForecastTimingUpcomingEventReadModel` | Bounded next movements (not liquidity) |

## Hierarchy (SCE)

**Interpretation → Exception → Explanation → Evidence**

- **Interpretation:** `interpretationState`, `timingCoverage`
- **Exception:** structured `exceptions[]` (`exceptionKind`, amounts, counts — no translated copy)
- **Explanation:** income/expense separation, coverage semantics, ranking
- **Evidence:** account reconciliation fields, event timing fields, source presentation

## Aggregate semantics

- Per-account values come from **`reconcileExpectedFinancialTiming`** (FIN-04E-02).
- Overview income/expense totals **sum account reconciliation** — no parallel formulas.
- **No double counting:** annual forecast is authority; expected events partition **remaining future expectation** only.
- **Net context:** `resultMinor = income − expense` on annual lines; `futureResultContextMinor` on remaining expectation — distinct questions.

## Income and expense

All movement and remainder fields are kept **separate** for income and expense. Net/result is secondary context only.

## Timing coverage

- Ratio uses **timed future expectation ÷ remaining future expectation** in **integer basis points** (10000 = 100%).
- When **overallocated**, `timedCoverageBasisPoints` is **capped at 10000**; `rawTimedCoverageBasisPoints` exposes the uncapped ratio.
- When **remaining = 0**, coverage kind is `NO_REMAINING_EXPECTATION`.
- **Ambiguous** amounts are excluded from timed numerator (remain distinct).

## Reference date

- Financial meaning uses **`actualsThroughDateIso`** from the current forecast version (or explicit caller input).
- **`referenceDateIso`** on the overview documents the cutoff used for classification and upcoming ordering.
- **No hidden `new Date()`** in the read layer.

## Account coverage

Accounts appear when they have any of:

- Current Forecast line
- Actual through cutoff (non-zero)
- Expected events owned by the finance year
- Reconciliation exception state

Accounts with forecast remainder but **zero events** remain visible (unscheduled remainder).

## Missing forecast line

Events without a Current Forecast line: **`FORECAST_LINE_MISSING`** exception; timing evidence retained; annual amount **not** coerced to zero.

## Upcoming movements

- **Finance year ownership** filters events (`financeYearId` on row).
- Cross-calendar-year **timing dates** are allowed for owned events.
- Ordering: earliest business timing anchor (EXACT_DATE / month start / range start for sort only), then amount, then id.
- Sort surrogates are **not** exposed as exact expected dates on the read model.

## Permissions

- `finance.forecast.view` (via `requireFinanceForecastView`)
- **FORECASTING** capability (product registry — same as FIN-04A–04D)
- No manage permission required for read intelligence

## Performance

Single snapshot load per overview: forecast pointer + lines, planning accounts, year actuals, year-owned events — then **in-memory** per-account reconciliation (no N+1).

## Deferred boundaries

| Area | Owner |
| --- | --- |
| Workspace UX | FIN-04E-05 |
| Effective-dated scenarios | FIN-04E-06 |
| Visual timing charts | FIN-04E-07 |
| Liquidity / runway | FIN-09 |
| FIN-05 reporting | Separate programme |

## Architecture locks

See `EXPECTED_FINANCIAL_EVENT_04E_04_ARCHITECTURE_LOCKS` in `expected-financial-event-architecture-contract.ts`.

## Tests

`lib/finance/__tests__/finance-04e-04-forecast-timing-read-model.test.ts` — empty/partial/balanced/overallocated/ambiguous profiles, income/expense separation, account coverage, cross-FY ownership, determinism, permissions, tenant isolation.
