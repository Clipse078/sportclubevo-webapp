# SCE Finance FIN-02A — Operational Budgeting Architecture (first slice)

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-02a-operational-budgeting` |
| **Merge target** | `STAGE` |
| **Builds on** | FIN-01D budget foundation, FIN-01E reporting & currency |
| **FIN-02 programme status** | **IN PROGRESS** (02A = architecture + first vertical slice) |

## Purpose

FIN-01D delivered budget **primitives** (models, draft editing, first approval, immutability). FIN-02 turns those into an **operational budgeting product** for plan → review → approve → preserve baseline.

FIN-02A does **not** rebuild FIN-01D. It adds:

- Explicit **working budget lifecycle** presentation (year, currency, status)
- **Approval readiness** with actionable prerequisites (not generic errors)
- **Governance baseline** context (what approval locks)
- **Post-approval working revision** (editable plan that does **not** replace reporting baseline)
- Calm **version history** (no Git-style complexity)

## Relationship to FIN-01D

| FIN-01D (retained) | FIN-02A (added) |
| --- | --- |
| `FinanceBudget` / `FinanceBudgetVersion` / `FinanceBudgetLine` | Readiness evaluator + workspace semantics |
| DRAFT → APPROVED first baseline | Working revision after approval |
| Local-first line editing | Readiness + baseline panels (no edit regression) |
| `finance.budget.*` / `finance.approve` | Unchanged permission model |

## Gap analysis summary

| Capability | Classification |
| --- | --- |
| Annual budget per financial year | **ALREADY EXISTS** |
| Working (draft) editing | **ALREADY EXISTS** |
| First baseline approval + immutability | **ALREADY EXISTS** |
| Readiness before approve | **NEEDS FIN-02** → **delivered in 02A** |
| Post-approval working revision | **NEEDS FIN-02** → **delivered in 02A** |
| Version history UI | **NEEDS FIN-02** → **delivered in 02A** |
| Re-baseline / supersede approved v2 | **FIN-02B+** |
| Prior-year copy | **FIN-02B** (architected, not implemented) |
| Line notes | **FIN-02B** |
| Cost-center / dimension budgeting | **FUTURE PACKAGE** |
| SUBMITTED workflow state | **NOT REQUIRED** (readiness is derived on DRAFT) |

## Lifecycle (FIN-02A)

```text
WORKING BUDGET (DRAFT v1)
  → readiness checks
  → APPROVED BASELINE (immutable, currency snapshot)
  → optional WORKING REVISION (DRAFT v2+ copied from baseline)
```

Reporting (`resolveApprovedBudgetMeasure`) continues to consume **APPROVED** only — never DRAFT revisions.

## Approved baseline contract

Preserved from FIN-01D/E:

- Financial year (via `FinanceBudget.financeYearId`)
- Line amounts + stable `financialAccountId`
- `baseCurrency` frozen on version at approval
- `approvedAt`, `approvedByUserId`, version id

Account **labels** are not snapshotted in 02A — stable IDs + live structure labels are sufficient until FIN-06 publication snapshots.

## Post-approval model (02A)

- **One governance APPROVED version** per tenant + year (unchanged invariant).
- After approval, `createWorkingBudgetRevision` opens a new **DRAFT** with incremented `versionNumber`, seeding lines from the approved baseline.
- Edits apply to the working revision only.
- **Re-approval / superseding** the governance baseline is explicitly **out of 02A** (FIN-02B).

## Governance

| Permission | Role |
| --- | --- |
| `finance.view` / `finance.budget.view` | View workspace |
| `finance.budget.manage` | Working budget + revisions |
| `finance.approve` / `finance.admin` | Approve first baseline |

No hardcoded treasurer / Vorstand roles.

## Data model

**No Prisma migration in 02A** — existing FIN-01D schema supports the slice.

## Exclusions (unchanged)

- FIN-01F import — **BACKLOG**
- FIN-03 actuals / variance — not started
- FIN-04 forecast — not started
- FIN-05/06 publishing — not started
- ASSET / LIABILITY / EQUITY budgeting — FIN-11

## Implementation map

| Area | Location |
| --- | --- |
| Readiness | `lib/finance/budget/budget-approval-readiness.ts` |
| Working revision | `createWorkingBudgetRevision` in `finance-budget-service.ts` |
| Workspace snapshot | `finance-budget-query-service.ts`, `budget-presentation.ts` |
| UI | `FinanceBudgetWorkspacePanel.tsx` |
| Tests | `budget-approval-readiness.test.ts`, `finance-02a-operational-budget.test.ts` |

## Remaining FIN-02 backlog (after 02A)

- Re-baseline / supersede approved governance version
- Prior-year budget copy
- Optional line notes
- Richer readiness (structural conflicts, optional dimensions)
- Comparison working vs baseline in grid
