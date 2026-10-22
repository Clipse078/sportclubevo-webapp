# SCE Finance FIN-01D — Budget Foundation & Workflow

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01d-budget-foundation-0fdb` |
| **Merge target** | `STAGE` |
| **FIN_01D_IMPLEMENTATION** | **COMPLETE** (feature branch — not merged) |
| **FIN_01D_PO_UAT** | **NOT_YET_PERFORMED** |
| **Scope** | Budget domain model, draft workflow, approval baseline, Budget workspace (foundation slice — not FIN-02 product) |

## Domain model

- **`FinanceBudget`**: one container per tenant + `FinanceYear` (`@@unique([tenantId, financeYearId])`).
- **`FinanceBudgetVersion`**: lifecycle **`DRAFT` → `APPROVED`** (FIN-01D boundary; ADR-019 `SUBMITTED` / `LOCKED` reserved for FIN-02+).
- **`FinanceBudgetLine`**: planned `amountMinor` (integer) per `FinancialAccount` leaf — **not** actuals, forecast, or postings.

## Baseline invariant

**One approved baseline per tenant + financial year.** A second approval or draft creation is rejected when an approved version already exists for that year.

## Approval immutability

Approved versions reject line upsert/delete (service guard + `isBudgetVersionImmutable` contract). Approved budgets cannot be deleted.

## Permissions

| Key | Use |
| --- | --- |
| `finance.view` / `finance.budget.view` | Read budget workspace |
| `finance.budget.manage` | Create draft, edit lines, delete draft |
| `finance.approve` / `finance.admin` | Approve baseline |

Reconciliation: `lib/permissions/finance-permission-reconciliation.ts` + migration backfill for `club_admin__*` and `super_admin`.

## Capability

**`BUDGETING`** marked implemented in `capability-registry.ts`. Tenant enablement still uses FIN-01B toggle pattern; route gated on capability + setup configured.

## Account dependency

`FinanceBudgetLine` blocks destructive account delete via registered structure delete guard. Archive/rename remain safe (stable account id).

## Migration

`prisma/migrations/20261022190000_sce_finance_01d_budget_foundation/migration.sql`

| Field | Value |
| --- | --- |
| **STAGE_MIGRATION_REQUIRED** | **YES** (before PO UAT on shared preview DB) |
| **STAGE_MIGRATION_APPLIED** | **NOT_YET** (agent run — apply via canonical STAGE migration runbook) |
| **PRODUCTION_TOUCHED** | **NO** |

## Routes

- `/dashboard/finance/budget` — Budget workspace

## FIN-02 boundary

FIN-01D does **not** implement scenarios, revisions, rolling forecast, actuals, variance, or full operational budgeting product (FIN-02).

## Future compatibility

Separate tables/semantics preserved for **Actual**, **Forecast**, and **Publication** (FIN-03…FIN-06). Budget lines reference account ids only; reporting group presentation may follow live structure until FIN-06 snapshots.
