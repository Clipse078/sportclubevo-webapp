# SCE Finance FIN-04C-04 — Forecast History & Comparison Query Layer

| Field | Value |
| --- | --- |
| **Status** | **COMPLETE** (FIN-04C-05 workspace UX next) |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |
| **Depends on** | FIN-04C-01…03, FIN-04B adoption, FIN-02 approved budget baseline |

## Purpose

Canonical **read-only** query layer for **Prognoseverlauf** and forecast revision comparisons. No UI, charts, or scenario workflow (FIN-04D).

## Read model

- **`FinanceForecastHistoryEntry`** — product-facing revision row (no raw Prisma).
- **`FinanceForecastHistoryReadModel`** — year-scoped history with display + chronological orderings.
- **`FinanceForecastVersionComparison`** — version-to-version (or budget-to-forecast) comparison with summary + account deltas.

Services (`lib/finance/services/finance-forecast-history-query-service.ts`):

| Function | Description |
| --- | --- |
| `loadFinanceForecastHistory` | Full Prognoseverlauf for a `FinanceYear` |
| `compareFinanceForecastVersions` | Arbitrary base/comparison within same year |
| `getCurrentForecastVsPrevious` | Previous (base) → Current (comparison) |
| `getCurrentForecastVsApprovedBudget` | Approved budget (base) → Current forecast (comparison) |

Server loaders: `app/(admin)/dashboard/finance/forecast/actions.ts` (read-only actions, `finance.forecast.view`).

## Ordering

- **Display:** CURRENT first, then historical **newest → oldest** by `versionNumber`.
- **Chronological:** oldest → newest by `versionNumber` (not `createdAt`).
- Legacy rows without `previousVersionId` remain in history; lineage is not fabricated.

## Legacy metadata

Nullable FIN-04A/04B fields remain valid. Presentation fallbacks:

- Source label: **Prognose**
- Historical title: **Frühere Prognose** when no label/source title applies
- Version number always secondary (`Version N` in subtitle)

## Revision source presentation

Domain source and display label are separate (`forecast-revision-presentation.ts`):

| Domain | Label |
| --- | --- |
| `INITIAL_FORECAST` | Initiale Prognose |
| `MANUAL_REFORECAST` | Festgehaltene Prognose |
| `AUTOMATIC_FORECAST_ADOPTION` | Automatische Prognose übernommen |
| `null` (legacy) | Prognose |

## Comparison direction

**BASE → COMPARISON**, `delta = comparison − base`.

| Pair | Base | Comparison |
| --- | --- | --- |
| Previous vs Current | Previous forecast | Current forecast |
| Budget vs Current | Approved budget | Current forecast |

No favorability in the query layer.

## Account comparison

Stable identity: **`FinancialAccount.id`**. Change kinds: `UNCHANGED`, `INCREASED`, `DECREASED`, `ADDED`, `REMOVED`. Absence ≠ explicit zero.

Largest changes: sort by `abs(deltaMinor)` desc, then account order.

## Previous forecast resolution

1. `current.previousVersionId` when valid (same forecast container).
2. Legacy fallback: highest `versionNumber` &lt; current among canonical management versions in the same `FinanceForecast`.
3. `NO_PREVIOUS_FORECAST` when none exists — never compare current to itself.

**CURRENT** is only `FinanceForecast.currentVersionId` (never MAX `versionNumber`).

## Approved budget

Uses **`resolveCurrentGovernanceBaselineVersion`** (FIN-02). Draft-only budgets → `NO_APPROVED_BUDGET`. Loaded under **`finance.forecast.view`** (no budget-manage permission).

## Boundaries

| Topic | Rule |
| --- | --- |
| **Automatic Forecast** | `FinanceProjectionVersion` excluded from Prognoseverlauf; FIN-04B projection comparison stays separate |
| **Scenarios** | `scenarioKey != null` excluded from history |
| **Actual vs Forecast** | No misleading full-year forecast − YTD actual; `actualsThroughDate` for context only |
| **Cross-year** | Invalid — typed `FINANCE_FORECAST_HISTORY_INVALID_COMPARISON` |
| **Tenant** | All queries tenant-scoped; cross-tenant IDs → not found / cross-tenant error |

## Query performance

Bounded loads: forecast → versions (batch) → lines (`in` query) → accounts → optional actors. No per-version N+1.

## Lineage diagnostics

`detectForecastHistoryLineageDiagnostics` reports self-reference, cycles, missing/wrong previous, non-monotonic numbers without failing the whole history read.

## 04C-05 UX contract

History rows can show: title (label/source), Datenstand, Aktuell badge, result total, comparison panels for income/expense/result and **Grösste Veränderungen**. Date formatting remains in 04C-05.

## Tests

`lib/finance/__tests__/finance-04c-04-history-comparison.test.ts`

## References

- `lib/finance/forecast/rolling-forecast-architecture-contract.ts` — `ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON`
- ADR-035 (updated status in roadmap)
