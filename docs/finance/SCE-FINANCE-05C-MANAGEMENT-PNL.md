# SCE-FINANCE-05C — Management P&L / Erfolgsrechnung

| Field | Value |
| --- | --- |
| **Programme** | FIN-05 — Financial Reporting & Intelligence |
| **Package** | **FIN-05C** — Management P&L presentation |
| **Status** | **COMPLETE** — Product Owner visual UAT **PASS** (approved for merge to **STAGE**) |
| **Architecture base** | FIN-05A + FIN-05B (`1cad40593191ebb88d91e5a41aab82a438130a2d` on **STAGE**) |
| **Branch** | `cursor/sce-finance-05c-management-pnl` |
| **Route** | `/dashboard/finance/reports` (Reporting workspace — Erfolgsrechnung) |

## Purpose

First user-facing **management** income statement for sports organisations. It **interprets** approved budget, actual, and current forecast — it is **not** statutory accounting (FIN-11) and not liquidity (FIN-09).

## Read model

- **`FinanceManagementPnlReadModel`** — presentation-neutral composition over FIN-05B primitives.
- Loader: `loadFinanceManagementPnlReadModel` in `finance-management-reporting-query-service.ts`.
- Builder: `build-finance-management-pnl-read-model.ts` + `build-management-pnl-tree.ts`.

React primarily **renders** — no client-side financial recalculation.

## Columns (default)

| Column | Source |
| --- | --- |
| Approved budget | FIN-02 governance baseline |
| Actual | FIN-03B (annual or explicit YTD cutoff label) |
| Current forecast | FIN-04 `currentVersionId` |
| Forecast vs budget | FIN-05B semantic variance |
| Variance % | FIN-05B (null when baseline zero / missing) |

**Actual vs budget** variance is **not** shown as a default column when grain is YTD vs annual budget (`PERIOD_MISMATCH` — no fake phasing).

## Hierarchy & completeness

- Structure from tenant `FinancialReportingGroup` + `FinancialAccount` (INCOME / EXPENSE).
- **Unassigned residual** (`Nicht zugeordnet` / `Unassigned`): presentation-only group `__sce_management_pnl_unassigned__` for planning accounts with values that are not represented in the reachable hierarchy (orphan / missing group). Does **not** mutate tenant configuration.
- **Archived** accounts remain in the statement when they carry historical values.
- **Reconciliation** metadata per source (budget / actual / forecast) proves represented section totals match canonical in-scope totals.

## Permissions

Measure-scoped visibility reuses `finance.view`, `finance.budget.view`, `finance.actual.view`, `finance.forecast.view`. Restricted measures are omitted — not zero-filled.

## Boundaries (not in FIN-05C)

| Package | Status |
| --- | --- |
| FIN-05D Finance Übersicht | **COMPLETE** (PR **#911** → **STAGE**) |
| FIN-05E Reporting drill-down workspace | Implemented (PO UAT pending) |
| FIN-05F / 05G beyond P&L presentation | Not implemented |
| FIN-06 Publishing | Not implemented |
| FIN-09 Liquidity | Not implemented |
| FIN-11 Statutory accounting | Not implemented |

## Tests

- `lib/finance/__tests__/finance-05c-management-pnl.test.ts` — reconciliation, unassigned, permissions, period safety.
- `lib/finance/__tests__/finance-05c-reporting-architecture.test.ts` — architecture locks.
- `components/admin/finance/__tests__/FinanceManagementPnlPanel.test.tsx` — component structure.

## Next

**FIN-05E** — Reporting workspace drill-down (**IMPLEMENTED** — PO UAT pending).

**FIN-05F** — Comparative intelligence (**NEXT** — not started).
