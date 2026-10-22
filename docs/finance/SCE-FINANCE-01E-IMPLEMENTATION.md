# SCE Finance FIN-01E — Management Reporting Foundation

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01e-reporting-foundation-b4b9` |
| **Merge target** | `STAGE` |
| **Scope** | Reusable reporting read model, aggregation, approved-budget measure adapter, minimal Finance Overview integration |
| **Status** | **R3 ON FEATURE BRANCH / AWAITING PO RETEST** |

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

- **Organisation base currency**: `FinanceConfiguration.baseCurrency` — canonical ISO 4217 code, set via searchable selector (FIN-01E R3).
- **Approved baseline currency context**: `FinanceBudgetVersion.baseCurrency` frozen at approval (nullable for pre-R3 approved baselines).
- Reporting uses `version.baseCurrency ?? configuration.baseCurrency` for display context.
- No Finance-core CHF hardcoding or country inference.
- Reporting scoped to explicit `FinanceYear` (not sports season).

## FIN-01E R3 — PO UAT defect closure

### Observed defect (R2 retest)

- Finance Settings exposed **free-text** ISO entry; PO requires searchable ISO-4217 combobox.
- Tenant progressed through FIN-01B/C/D with structure, finance year, and **approved budget baseline** while `FinanceConfiguration.baseCurrency` remained **null**.
- Finance Overview correctly showed **Basiswährung fehlt** and blocked reporting.

### Root cause (data lifecycle)

| Stage | Currency requirement |
| --- | --- |
| FIN-01B migration | `baseCurrency` nullable by design |
| Structure / year / capabilities | Allowed without currency |
| FIN-01D budget approval (pre-R3) | **Did not require** organisation base currency |
| FIN-01E reporting | Requires configured base currency |

**Conclusion**: Approved monetary baselines could exist without organisation currency configuration — a setup integrity gap, not a destructive write clearing `baseCurrency`.

### R3 corrections

1. **Searchable ISO 4217 selector** (`FinanceBaseCurrencySelector` + `Intl.supportedValuesOf('currency')` catalogue).
2. **Strict validation** — only supported ISO 4217 codes persist (not arbitrary three-letter strings).
3. **Settings UX** — action errors surfaced; `router.refresh()` after successful save.
4. **Budget approval gate** — cannot approve draft baseline without configured organisation currency.
5. **Approval snapshot** — `FinanceBudgetVersion.baseCurrency` set at approve time (migration `20261022200000_sce_finance_01e_r3_budget_version_base_currency`).
6. **Currency change safety** — cannot change organisation base currency while any approved baseline exists (first-time set from null allowed for legacy reconciliation — does not silently assign CHF to historical lines).

### Legacy approved baselines (e.g. FC Allschwil PO dataset)

- Pre-R3 approved versions may have `baseCurrency = null`.
- PO must **explicitly select** organisation currency in Settings; amounts remain unchanged.
- Reporting becomes available once configuration is persisted; currency context uses organisation setting until/version snapshot when present.

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

| Migration | Purpose |
| --- | --- |
| `20261022200000_sce_finance_01e_r3_budget_version_base_currency` | Optional `FinanceBudgetVersion.baseCurrency` snapshot at approval |

Reporting read model itself remains derived (no report snapshot tables in FIN-01E).

## Exclusions confirmed

Actuals, forecast, variance, FIN-05 suite, FIN-06 publishing/sharing/export, commitments, receivables, treasury, full accounting, Sponsor/Commercial — not implemented.

## Tests

- `lib/finance/__tests__/finance-01e-reporting.test.ts` — tree, aggregation, approved source, tenant isolation, permissions, overview slice.
- `lib/finance/__tests__/finance-01e-r3-currency.test.ts` — ISO catalogue, search, persistence, reporting closure, currency change safety.
- `lib/finance/__tests__/finance-configuration-base-currency.test.ts` — configuration lifecycle regressions.
- `lib/finance/__tests__/finance-01d-budget.test.ts` — approval currency prerequisite.

## Future compatibility

- **FIN-01F**: imported values map to stable accounts → new measure providers.
- **FIN-02–04**: additional budget/actual/forecast measures share the same tree engine.
- **FIN-05**: intelligence UI consumes read models.
- **FIN-06**: `reportingContextKey` + explicit scope supports versioned publication snapshots; version-level `baseCurrency` supports auditable approved-baseline snapshots.
