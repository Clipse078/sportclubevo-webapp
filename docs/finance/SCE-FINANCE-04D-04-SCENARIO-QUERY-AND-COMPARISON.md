# SCE-FINANCE-04D-04 — Scenario Query & Comparison Layer

| Field | Value |
| --- | --- |
| **Package** | FIN-04D-04 — query / read model / comparison intelligence |
| **Status** | **COMPLETE** — FIN-04D-05 workspace UX next |
| **Branch** | `cursor/sce-finance-04d-scenarios-what-if` |
| **Depends on** | FIN-04D-01 (architecture), FIN-04D-02 (persistence), FIN-04D-03 (`calculateFinanceScenario`) |

## Executive summary

FIN-04D-04 turns canonical scenario **calculation results** into stable, decision-oriented **read models** so presentation (FIN-04D-05) does not re-implement finance logic in React.

Layering:

```
Persistence → Calculation engine → Query / comparison read model → Presentation → UI
```

## Read models

| Read model | Service | Purpose |
| --- | --- | --- |
| `FinanceScenarioListReadModel` | `loadFinanceScenarioList` | Compact year-scoped scenario index (totals, freshness, assumption count) |
| `FinanceScenarioDetailReadModel` | `loadFinanceScenarioDetail` | Full scenario workspace payload (metadata, calculation, comparisons, drivers) |
| `FinanceScenarioComparisonReadModel` | (embedded in detail) | Primary + secondary comparisons and summary semantics |
| `FinanceScenarioDriver` | (derived in detail) | Assumption-driven result contributions |
| `FinanceScenarioAccountEffect` | (derived in detail) | Account-level baseline → scenario effects |

Types: `lib/finance/forecast/finance-scenario-read-model.ts`

No raw Prisma entities are returned. Currency amounts use `*Minor` integers without formatted strings in core models.

## Comparison hierarchy

1. **Primary (headline):** scenario result vs **frozen creation baseline** (FIN-04D-03 totals).
2. **Context:** baseline freshness vs live **Current Forecast** pointer (`FinanceForecast.currentVersionId` — never `MAX(versionNumber)`).
3. **Secondary:** scenario result vs **Approved Budget** (governance baseline resolver from FIN-02/04C).
4. **Deferred v1:** scenario-to-scenario comparison (`SCENARIO_QUERY_LAYER.scenarioToScenarioComparisonV1 = DEFERRED`).

Neutral delta semantics everywhere: **comparison − base** (scenario − reference).

Favorability is **not** encoded in core read models.

## Baseline freshness

| Status | Meaning |
| --- | --- |
| `CURRENT` | `sourceForecastVersionId === currentForecastVersionId` |
| `OUTDATED` | Current Forecast exists but pointer differs from scenario source version |
| `CURRENT_FORECAST_UNAVAILABLE` | No canonical Current Forecast resolvable |

Freshness does **not** mutate scenarios, rebase baselines, or invalidate archived scenarios.

## Live Current Forecast comparison

When available, exposes scenario result vs **live** current forecast totals and optional account-level rows (stable `FinancialAccount.id`, explicit line presence — zero vs absent preserved).

This is **not** the frozen baseline comparison and does not replace primary assumption-effect semantics.

## Drivers

Drivers are built from FIN-04D-03 `assumptionEffects` / `resultContributionMinor`:

- Rank: `ABS(resultContributionMinor)` descending, tie-break `financialAccountId`.
- Default top bound: `FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT` (5).
- Zero contribution excluded from `topDrivers` by default.
- Offsetting income/expense contributions preserved when net `resultDeltaMinor === 0`.

## Summary semantics

| State | Condition |
| --- | --- |
| `NO_ASSUMPTIONS` | Zero assumptions |
| `NO_RESULT_CHANGE` | Assumptions present, no result/composition change |
| `RESULT_CHANGED` | Non-zero result delta and/or composition change with zero net result |

`changeFlags` exposes `hasResultChange`, `hasIncomeChange`, `hasExpenseChange`, `hasAccountChanges`, `hasCompositionChange`.

## Query strategy & consistency

**List:** one scenario query + batched baseline lines + batched assumptions + one current forecast resolution + one account semantics load; in-memory engine per row.

**Detail:** scenario row + baseline + assumptions loaded inside a single transaction boundary when supported; bounded parallel loads for forecast context, approved budget, and account presentation metadata.

## Boundaries (explicit non-goals)

- No Scenario workspace UI (FIN-04D-05).
- No charts / chart-library types in domain read models.
- No adoption or rebase (FIN-04D-06).
- No timed cash / liquidity phasing.
- No Automatic Forecast in default comparison set.
- No new migrations in FIN-04D-04.

## Permissions

Read queries require `finance.forecast.view` only (tenant + `FinanceYear` isolation).

## Code map

| Concern | Location |
| --- | --- |
| Read model types | `lib/finance/forecast/finance-scenario-read-model.ts` |
| Comparison helpers | `lib/finance/forecast/finance-scenario-comparison.ts` |
| Driver ranking | `lib/finance/forecast/finance-scenario-drivers.ts` |
| Query services | `lib/finance/services/finance-scenario-query-service.ts` |
| Architecture locks | `SCENARIO_QUERY_LAYER` in `scenario-architecture-contract.ts` |
| Tests | `lib/finance/__tests__/finance-04d-04-scenario-query.test.ts` |
