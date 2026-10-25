# SCE-FINANCE-05B — Management Reporting Read Models & Variance Engine

| Field | Value |
| --- | --- |
| **Programme** | FIN-05 — Financial Reporting & Intelligence |
| **Package** | **FIN-05B** — read models + deterministic variance engine |
| **Status** | **IMPLEMENTED** — awaiting Product Owner review |
| **Architecture base** | FIN-05A (`finance-reporting-intelligence-architecture-contract.ts`) |
| **Branch** | `cursor/sce-finance-05b-reporting-read-models-variance-engine-f86e` |

## Scope

FIN-05B implements the **presentation-neutral** server-side analytical foundation for management reporting. It does **not** ship Übersicht UI, Management P&L pages, Reporting workspace, charts, liquidity, or statutory accounting.

## Reuse audit

| Area | Reused | Extended |
| --- | --- | --- |
| FIN-03A variance | `computeAccountVarianceMetrics` | `computeSemanticVarianceMetrics` for generic baseline/comparison pairs |
| FIN-03B actual | `aggregateActualTotalsByAccount`, cutoff filtering | `resolveActualMeasure` with explicit grain/cutoff |
| FIN-04 forecast | `currentVersionId` pointer pattern | `resolveCurrentForecastMeasure` |
| FIN-01 hierarchy | `buildFinancialReportingTree`, group ordering | `buildVarianceReportingTree` |
| FIN-01E approved budget | `resolveApprovedBudgetMeasure` | unchanged |
| Comparative measures | — | Consolidated into `FinanceVarianceAnalysisReadModel` (no duplicate wrapper) |

## Comparison engine

| Pair | Grain | Status |
| --- | --- | --- |
| `ACTUAL_VS_APPROVED_BUDGET` | Annual full year | Supported |
| `CURRENT_FORECAST_VS_APPROVED_BUDGET` | Annual full year | Supported |
| `ACTUAL_YTD_VS_ANNUAL_*` | Mixed | **PERIOD_MISMATCH** — no fake phasing |
| `ACTUAL_VS_CURRENT_FORECAST` | Mixed | **Unsupported** in FIN-05B |

**Orientation:** `rawDeltaMinor = comparisonMinor - baselineMinor` (same as FIN-03A actual − budget).

## Read models

- **`FinanceManagementOverviewReadModel`** — interpretive foundation for FIN-05D (measures, availability, management-result variances, ranked drivers).
- **`FinanceVarianceAnalysisReadModel`** — analytical hierarchy with baseline/comparison slices, favourability, contribution ranks.

Query entry points: `loadFinanceManagementOverviewReadModel`, `loadFinanceVarianceAnalysisReadModel` in `finance-management-reporting-query-service.ts`.

## Permissions

Measure-scoped visibility uses existing keys (`finance.view`, `finance.budget.view`, `finance.actual.view`, `finance.forecast.view`). Restricted measures are omitted — not zero-filled.

## Tests

Focused coverage in `lib/finance/__tests__/finance-05b-management-reporting-variance-engine.test.ts` and `finance-05b-reporting-architecture.test.ts`.

## Next

**FIN-05C** — Management P&L / Erfolgsrechnung presentation (consumes FIN-05B primitives).
