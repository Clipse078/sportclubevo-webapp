# SCE Finance FIN-01D — Budget Foundation & Workflow

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01d-budget-foundation-0fdb` |
| **Merge target** | `STAGE` |
| **PR** | **#894** (owner merge — not auto-merged by agents) |
| **Closure head (R6)** | `be3b55d4f43f1d5224b2863f637ec9445697b7bd` (R5 UX: `7c321288b34704919b76b496f701b9e183dccc82`) |
| **FIN_01D_IMPLEMENTATION** | **COMPLETE** |
| **FIN_01D_STAGE_MIGRATION_APPLIED** | **YES** (2026-10-22 — shared STAGE Neon via guarded `db:migrate:deploy-if-enabled`; schema up to date) |
| **FIN_01D_READY_FOR_PO_UAT** | **YES** |
| **FIN_01D_PO_UAT** | **PASS** (Product Owner manual UAT — authoritative; Cursor did not perform manual browser UAT) |
| **FIN_01D_READY_FOR_MERGE** | **YES** |
| **FIN_01D_MERGED** | **NO** (until PR **#894** lands on **STAGE**) |
| **Scope** | Budget domain model, draft workflow, approval baseline, Budget workspace (foundation slice — not FIN-02 product) |

## PO UAT confirmation (2026-10-22, R6 — final)

Product Owner manual UAT **PASS** confirms acceptance of:

1. **Capability activation / navigation (R2)** — Budget context tab is capability- and RBAC-aware; prerequisites nudge inside the workspace without hiding Budget; no combined **Finanzen & Partnerschaften** label; **Sponsoring** remains separate.
2. **Prerequisite nudging** — Setup gaps explained in-workspace; Finance Overview / Structure / Budget / Setup hierarchy consistent.
3. **Budget creation / editing** — Draft workflow, line editing on leaf accounts, deliberate persistence boundary.
4. **Baseline approval workflow** — Approve action attributable; approval flushes pending local edits safely.
5. **Approved baseline immutability** — Approved versions reject destructive line edits and draft deletion semantics per contract.
6. **Local-first editing performance (R3)** — Rapid cross-row editing; no server/DB/route refresh per keystroke; local totals while editing; focus stable during background saves.
7. **Whole-unit financial planning presentation** — Planning amounts without `.00` noise; integer minor-unit storage preserved.
8. **Tenant base-currency presentation (R4)** — Canonical `FinanceConfiguration.baseCurrency`; totals expose ISO currency when configured (no Finance-core CHF hardcoding).
9. **Financial-year selector behaviour** — Explicit year selection (no implicit first-year default in UI).
10. **Shared dark Finance surfaces (R5)** — Overview, Structure, Budget, and Setup use consistent dark functional surfaces; SCE artwork ambient; no card/border soup or oversized page chrome; responsive desktop presentation.
11. **FIN-01B regression** — Setup, capabilities, navigation separation, canonical toggles accepted.
12. **FIN-01C regression** — Financial Structure Builder accepted alongside Budget foundation.
13. **Sponsoring** — Remains separate; not part of FIN-01D.

Cursor did not invent additional manual UAT evidence beyond this Product Owner sign-off.

## Revision closure (R2–R5)

| Rev | Focus | Status |
| --- | --- | --- |
| **R1** | Budget domain, migration, permissions, draft → approved baseline | **COMPLETE** |
| **R2** | Capability-aware navigation; in-workspace prerequisite nudging | **PO UAT PASS** |
| **R3** | Local-first budget line editing + performance contract tests | **PO UAT PASS** |
| **R4** | Whole-unit planning amounts + tenant currency presentation | **PO UAT PASS** |
| **R5** | Shared dark Finance workspace UX (`finance-workspace-surfaces.ts`) | **PO UAT PASS** |
| **R6** | PO UAT recording + merge closure (this document) | **COMPLETE** |

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
| **STAGE_MIGRATION_APPLIED** | **YES** (`20261022190000_sce_finance_01d_budget_foundation`; last common pre-apply: `20261022180000_sce_finance_01c_financial_structure`) |
| **PRODUCTION_TOUCHED** | **NO** |
| **DUPLICATE_MIGRATION_CREATED** | **NO** |

### STAGE permission reconciliation (R1)

- Migration backfill assigns `finance.budget.view`, `finance.budget.manage`, and `finance.approve` to `super_admin` and all `club_admin__*` roles (`ON CONFLICT DO NOTHING`).
- Post-deploy tenant Club Admin catalog reconciliation runs automatically from the guarded migration runner (canonical FIN-01B/01C pattern).
- Verified on STAGE: **0** missing `RolePermission` rows for the three FIN-01D keys across `club_admin__*` roles (sample: `club_admin__fc-allschwil` has all three).

## Routes

- `/dashboard/finance/budget` — Budget workspace

## Performance contract (R3 — automated + PO accepted)

- Keystrokes update local draft state only (`onLocalDraftChange` / `budgetTotalsFromDraft`).
- Persistence via deliberate server-action boundary (`onPersist`, `flushPendingLineSaves`, approval flush).
- No `router.refresh` or per-keystroke `saveBudgetLineAction` on `onChange`.
- Contract enforced in `lib/finance/__tests__/finance-01d-budget-performance.test.ts`.

## Currency presentation (R4)

- Source of truth: `FinanceConfiguration.baseCurrency` (see budget page context + presentation formatters).
- Whole major units in UI; integer `amountMinor` in storage (`budget-amount-presentation.ts`).
- Searchable ISO 4217 currency combobox for Basiswährung remains **preserved backlog** from FIN-01B (not a FIN-01D blocker).

## FIN-02 boundary

FIN-01D does **not** implement scenarios, revisions, rolling forecast, actuals, variance, periodic control, reporting, publishing/sharing, commitments, receivables, treasury, statutory accounting, or Sponsor / Commercial product surfaces.

## Future compatibility

Separate tables/semantics preserved for **Actual**, **Forecast**, and **Publication** (FIN-03…FIN-06). Budget lines reference account ids only; reporting group presentation may follow live structure until FIN-06 snapshots.
