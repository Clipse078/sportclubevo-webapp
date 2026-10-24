# SCE-FINANCE-04D-03 — Scenario Calculation & Assumption Engine

| Field | Value |
| --- | --- |
| **Package** | FIN-04D-03 — deterministic scenario calculation engine |
| **Status** | **COMPLETE** — consumed by FIN-04D-04 query/comparison |
| **Branch** | `cursor/sce-finance-04d-scenarios-what-if` |
| **Engine version** | `sce-scenario-v1` (`FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION`) |

## Executive summary

FIN-04D-03 implements the **canonical deterministic calculation path**:

**FROZEN BASELINE + SCENARIO ASSUMPTIONS → DERIVED SCENARIO RESULT**

There is exactly one authoritative engine. No LLM, no generative AI, no stochastic numerics, no user-selectable algorithm. Identical inputs (baseline, assumptions, account semantics, engine version) always produce identical outputs.

Results are **derived and not persisted** — they are recomputed from frozen baseline lines and stored assumption intent.

---

## Code map

| Concern | Location |
| --- | --- |
| Engine version & domain types | `lib/finance/forecast/finance-scenario-calculation-types.ts` |
| Pure calculation errors | `lib/finance/forecast/finance-scenario-calculation-errors.ts` |
| Pure engine | `lib/finance/forecast/calculate-finance-scenario.ts` |
| Per-assumption arithmetic (v1) | `lib/finance/forecast/scenario-assumption-calculation.ts` |
| Persisted scenario loader | `calculatePersistedFinanceScenario` in `lib/finance/services/finance-scenario-service.ts` |
| Totals aggregation | `computeBudgetPlanningTotals` → `computeCanonicalFinancialResult` (INCOME / EXPENSE / RESULT = INCOME − EXPENSE) |

---

## Calculation equation

For each account in the **frozen baseline**:

```
scenarioAmountMinor = transform(baselineAmountMinor, assumptionKind, assumptionPayload)
deltaMinor = scenarioAmountMinor − baselineAmountMinor
```

Accounts without assumptions keep `scenarioAmountMinor = baselineAmountMinor`.

### Assumption semantics (v1)

| Kind | Result |
| --- | --- |
| `PERCENT_CHANGE` | `baseline × (10000 + basisPoints) / 10000`, rounded with `roundRationalToMinor` (half away from zero) |
| `DELTA_AMOUNT` | `baseline + amountMinorDelta` (checked integer arithmetic) |
| `ABSOLUTE_AMOUNT` | `absoluteAmountMinor` (zero is valid) |
| `EXCLUDE_ACCOUNT` | `0` (explicit scenario intent; not “missing”) |

**NULL / missing baseline ≠ zero** for percent/delta transforms. FIN-04D-02 baselines originate from forecast lines with concrete `amountMinor`; malformed input is rejected — assumptions must not reference accounts absent from the frozen baseline.

---

## Result contribution (driver invariant)

Canonical financial result: **RESULT = INCOME − EXPENSE**.

| Account type | `resultContributionMinor` for account delta |
| --- | --- |
| INCOME | `+deltaMinor` |
| EXPENSE | `−deltaMinor` |

**Integrity invariant (locked by tests):**

```
Σ assumptionEffects.resultContributionMinor = totals.resultDeltaMinor
```

Unchanged accounts have `resultContributionMinor = 0` and do not appear in `assumptionEffects`.

---

## Totals

Baseline totals are computed **only** from frozen baseline lines. Scenario totals from resulting account amounts.

Neutral deltas:

- `incomeDeltaMinor = incomeMinor − baselineIncomeMinor`
- `expenseDeltaMinor = expenseMinor − baselineExpenseMinor`
- `resultDeltaMinor = resultMinor − baselineResultMinor`

No favorability encoding in the domain result.

---

## Determinism guarantees

- One assumption per account (duplicate assumptions → typed error, not order-dependent application).
- Stable output ordering: `accountResults` and `assumptionEffects` sorted by `financialAccountId`.
- Input order of assumptions does not affect totals or per-account amounts.
- Engine does not mutate input arrays/objects.
- Repeated runs return deep-equal results.

---

## Error model (pure engine)

| Code | Meaning |
| --- | --- |
| `INVALID_SCENARIO_INPUT` | Malformed identity or integrity failure |
| `DUPLICATE_BASELINE_ACCOUNT` | Duplicate baseline account id |
| `DUPLICATE_ASSUMPTION_ACCOUNT` | Duplicate assumption for same account |
| `ASSUMPTION_ACCOUNT_NOT_IN_BASELINE` | Assumption without frozen baseline line |
| `INVALID_ASSUMPTION_PAYLOAD` | Assumption cannot be applied to baseline |
| `UNSUPPORTED_ACCOUNT_TYPE` | Account semantic not INCOME/EXPENSE |
| `UNSAFE_INTEGER_RESULT` | Non-safe integer or overflow |

Service layer maps these to `FinanceDomainError` codes (`FINANCE_SCENARIO_*`).

---

## Boundaries (explicit non-scope)

| Boundary | Policy |
| --- | --- |
| **Live Current Forecast** | Not read during calculation after baseline creation; comparison only in FIN-04D-04 |
| **Approved Budget** | Not read |
| **Automatic Forecast** | Not read |
| **Actual refresh** | Baseline metadata is provenance only; new actuals do not alter frozen baseline |
| **Timed cash / phasing** | Not in v1 engine |
| **AI / LLM** | Never authoritative arithmetic |
| **Result persistence** | No `FinanceScenarioResultLine` — no migration in 04D-03 |
| **Adoption / rebase** | FIN-04D-06+ |

---

## Permissions

`calculatePersistedFinanceScenario` requires **`finance.forecast.view`** (read operation). Validates tenant, finance year, and scenario ownership.

Archived scenarios remain calculable.

---

## Migration

No new migration. FIN-04D-02 migration `20261024160000_sce_finance_04d_02_scenario_persistence` remains the persistence boundary.

---

## Binary control compliance

FIN-04D-03 introduces **no UI** and **no new binary checkboxes** (`NEW_BINARY_CHECKBOXES = 0`).
