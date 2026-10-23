# SCE-FINANCE-03A — Actuals & Variance Foundation

| Field | Value |
| --- | --- |
| **Package** | FIN-03A |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
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

## PO UAT hints

1. Enable **ACTUALS** capability in Finance settings.
2. Ensure approved baseline exists for a finance year.
3. Open **Finanzen → Ist** tab.
4. Record income/expense actuals; verify full-year variance table.
5. Switch to YTD mode — confirm no YTD budget variance label; annual budget remains reference.
6. Re-baseline budget — actual entries unchanged; variance uses new baseline.
