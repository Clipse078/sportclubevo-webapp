# SCE-FINANCE-03A — Actuals & Variance Foundation

| Field | Value |
| --- | --- |
| **Package** | FIN-03A |
| **Status** | **IMPLEMENTED / STAGE DB READY / PO UAT IN PROGRESS** |
| **Branch** | `cursor/sce-finance-03a-actuals-variance-foundation` |
| **Target** | STAGE |

## Product scope

Management finance actuals (measured outcomes) compared to the **current governance baseline** (FIN-02B). Not statutory accounting (FIN-11).

### Delivered

- `FinanceActualEntry` persistence (atomic actual grain, date provenance)
- Domain variance semantics (raw delta vs favorability)
- Full-year budget vs actual comparison mode
- YTD **actual** aggregation without fabricated budget phasing
- Manual actual CRUD vertical slice (`/dashboard/finance/actuals`)
- Permissions: `finance.actual.view`, `finance.actual.manage`
- ACTUALS capability surface (tenant enablement)

### Explicitly deferred (FIN-03B+)

- Periodic review workflow, variance explanations (FIN-02D backlog)
- Budget phasing / monthly allocation
- Import, bank, receivables/payment sourcing (FIN-08/09)
- General ledger / journal semantics (FIN-11)

## Architecture decisions

| Topic | Decision |
| --- | --- |
| Actual grain | `FinanceActualEntry` per account + finance year + `effectiveDate` |
| Variance storage | Derived only — not persisted |
| Sign | Income/expense actuals stored as **positive magnitude**; result = INCOME − EXPENSE |
| Raw delta | `actual − budget` |
| Favorability | INCOME: `rawDelta`; EXPENSE: `budget − actual` |
| YTD budget variance | **Not supported** until phasing exists |
| Re-baseline | Actuals bind to year/account/date; baseline resolved at read time |
| Currency | Must match tenant `FinanceConfiguration.baseCurrency` |
| Cost center | Optional future dimension — omitted in FIN-03A |
| Provenance | `FinanceActualEntrySource`: MANUAL, IMPORT, SYSTEM (create uses MANUAL) |

## Schema

See migration `20261023120000_sce_finance_03a_actuals_foundation`.

## STAGE migration (R1)

Shared STAGE must apply `20261023120000_sce_finance_03a_actuals_foundation` before PR Preview PO UAT (Preview builds do not run migrations). Operator procedure: `docs/deployment/stage-preview-migration-runbook.md`.

- Verify / apply: `npm run finance:03a:r1:stage-migration-verify` (read-only default; pass `--apply` with guarded env as documented in `scripts/sce-finance-03a-r1-stage-migration-verify.ts`).
- **2026-10-23:** migration applied on designated shared STAGE (`ep-wispy-hall-aso93dy6`, fingerprint `acd3b37682911890`).

## PO UAT hints

1. Enable **ACTUALS** capability in Finance settings.
2. Ensure approved baseline exists for a finance year.
3. Open **Finanzen → Ist** tab.
4. Record income/expense actuals; verify full-year variance table.
5. Switch to YTD mode — confirm no YTD budget variance label; annual budget remains reference.
6. Re-baseline budget — actual entries unchanged; variance uses new baseline.

## PO UAT findings (R2)

| # | Severity | Finding | R2 resolution |
| --- | --- | --- | --- |
| 1 | Blocker | No discoverable **Ist-Wert erfassen** action | Primary action in context strip (`ms-auto`), entries section header, and empty state; label **Ist-Wert erfassen**; dialog shows configured `FinanceYear.name` |
| 2 | UX | Flat variance table mixed income/expense with redundant **Typ** column | Split into **Einnahmen · {year}** then **Ausgaben · {year}**; **Typ** removed from comparison tables |
| 3 | UX | Finance year name not repeated in scrolled sections | Section headings use `{SECTION} · {FinanceYear.name}` pattern (aligned with FIN-02C-R1) |

R2 is UI-only: **no schema / migration changes**.
