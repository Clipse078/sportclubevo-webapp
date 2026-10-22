# SCE Finance FIN-01E — Management Reporting Foundation

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01e-reporting-foundation-b4b9` |
| **Merge target** | `STAGE` |
| **Scope** | Reusable reporting read model, aggregation, approved-budget measure adapter, minimal Finance Overview integration |
| **Status** | **IMPLEMENTED ON FEATURE BRANCH / AWAITING PO UAT** |

## Purpose

Establish canonical financial reporting language on top of FIN-01C structure and FIN-01D approved budget baseline — without building FIN-05 reporting product, FIN-06 publication, or operational measures (Actual / Forecast).

## Reporting model

- **Hierarchy**: `FinancialReportingGroup` (tenant labels) → nested groups → `FinancialAccount` leaves (`INCOME` / `EXPENSE` canonical semantics only).
- **Read model**: `FinancialReportingReadModel` with `tree`, `summary`, explicit `financeYearId`, `measure`, `mode: LIVE`, and stable `reportingContextKey` for future publication snapshots.
- **No second hierarchy** and no speculative persistence for reports, snapshots, or future measures.

## Financial measures

- **Implemented**: `APPROVED_BUDGET` via `resolveApprovedBudgetMeasure` (approved version lines only; draft never substituted).
- **Future**: ACTUAL, FORECAST, etc. plug in through additional measure providers — no empty schemas reserved in FIN-01E.

## Aggregation

- Integer minor-unit arithmetic via `computeCanonicalFinancialResult` and tree rollups in `buildFinancialReportingTree`.
- **RESULT = INCOME − EXPENSE** from canonical account semantics, not tenant-visible labels.
- FIN-01D local budget totals reuse the same canonical primitive through `computeBudgetPlanningTotals`.

## Approved budget adapter

- `loadApprovedBudgetReportingReadModel` (requires `finance.view`) loads tenant structure + approved baseline for resolved `FinanceYear`.
- Distinction preserved: **approved baseline reporting** vs **draft planning UI** (Budget workspace).

## Lifecycle

- Archived / renamed accounts remain addressable by stable id; approved line amounts stay on the account leaf in the reporting tree.

## Currency & year

- `FinanceConfiguration.baseCurrency` propagated; no Finance-core CHF hardcoding.
- Reporting scoped to explicit `FinanceYear` (not sports season).

## Permissions & tenant isolation

- Reuses **`finance.view`**; no new reporting permission matrix.
- All queries tenant-scoped; tests assert cross-tenant isolation.

## Live reporting vs publication

| Concept | FIN-01E |
| --- | --- |
| Live reporting read model | **Yes** — derived from current canonical data |
| Publication / share / export | **No** — FIN-06+ |
| Snapshot persistence | **No** — context key only for future compatibility |

## UX (minimal)

- Finance Overview shows approved-budget income / expense / result when prerequisites met; nudging for missing structure or missing approved baseline (no fake zeros).

## Database

- **NEW_MIGRATION_CREATED = NO** — reporting is a derived read model.

## Exclusions confirmed

Actuals, forecast, variance, FIN-05 suite, FIN-06 publishing/sharing/export, commitments, receivables, treasury, full accounting, Sponsor/Commercial — not implemented.

## Tests

See `lib/finance/__tests__/finance-01e-reporting.test.ts` (tree, aggregation, approved source, tenant isolation, permissions, overview slice).

## Future compatibility

- **FIN-01F**: imported values map to stable accounts → new measure providers.
- **FIN-02–04**: additional budget/actual/forecast measures share the same tree engine.
- **FIN-05**: intelligence UI consumes read models.
- **FIN-06**: `reportingContextKey` + explicit scope supports versioned publication snapshots.
