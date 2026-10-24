# SCE-FINANCE-04B-03 — Evidence extraction & data sufficiency

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-03 |
| **Status** | **IMPLEMENTED** |
| **Shared STAGE migration (FIN-04B-02)** | **APPLIED** (`20261023200000_sce_finance_04b_02_projection_persistence`) |

## Purpose

Deterministic boundary that answers: *what trustworthy evidence exists for `(tenant, financeYear, account, actualsThroughDate)`*, and *is it sufficient to attempt a future projection methodology*?

This package does **not** compute `projectedAmountMinor` by itself; FIN-04B-04 consumes these outputs in `generateFinanceYearProjection`.

## Service entry points

| API | Location |
| --- | --- |
| `getProjectionEvidenceContext` | `lib/finance/services/finance-projection-evidence-service.ts` |
| `getProjectionEvidenceContextForFinanceYearAccounts` | batch wrapper (single loader pass) |
| `loadProjectionEvidenceLoaderBundle` | shared year-level loader |
| `assessProjectionDataSufficiency` | `lib/finance/projection/projection-data-sufficiency.ts` |
| `computeProjectionEvidenceFingerprint` | `lib/finance/projection/projection-evidence-fingerprint.ts` |
| `evaluateProjectionEvidenceStaleness` | `lib/finance/projection/projection-evidence-staleness.ts` |

## Evidence kinds (baseline)

- `CURRENT_YEAR_ACTUALS` — factual ledger observations (finance-year-relative months)
- `HISTORICAL_ACTUALS` — prior `FinanceYear` rows for the same `FinancialAccount.id`
- `BUDGET_BASELINE` — approved governance context (not predictive fact)
- `CURRENT_FORECAST` — organisation expectation context (not historical fact)

## Finance-year-relative periods

Uses FIN-03B `enumerateFinanceYearMonths`. Relative index `0` is the first calendar month overlapping the tenant `FinanceYear.startDate` (e.g. July for 01.07–30.06 years).

## Zero vs missing

- **`amountMinor: number`** — evidence exists (including zero entries in `FinanceActualEntry`)
- **`amountMinor: null`** — no observation for that period (missing)

Absence of rows does **not** imply zero.

## Observation completeness

| Value | Meaning |
| --- | --- |
| `COMPLETE` | Period fully elapsed through `actualsThroughDate` and has entry evidence |
| `PARTIAL` | Cutoff falls before period end (e.g. mid-October) |
| `NO_DATA` | No qualifying entries in the period |

## General sufficiency (methodology-agnostic)

Thresholds: `PROJECTION_GENERAL_SUFFICIENCY_THRESHOLDS` in `projection-data-sufficiency.ts`.

| Level | Intent |
| --- | --- |
| `INSUFFICIENT` | No actual history, archived target account, or only budget/forecast context |
| `LIMITED` | Some actuals but sparse history / too few complete periods / weak comparable seasons |
| `SUFFICIENT` | Enough structured actual history for a future methodology to attempt a projection |

Budget or forecast alone never yields `SUFFICIENT`.

## Supporting metrics

Returned on sufficiency assessment (e.g. `currentYearCompletePeriodCount`, `historicalFinanceYearCount`, `comparableRelativePeriodCount`, `cutoffRelativePeriodIndex`).

## Evidence fingerprint

SHA-256 over canonical JSON: tenant/year/account/currency/cutoff, ordered period observations (amount + completeness), historical series, budget/forecast version ids + amounts. Excludes display names and locales.

## Staleness

Read-only `FRESH` / `STALE` by comparing persisted `evidenceFingerprint` + `actualsThroughDate` to current evidence. Does not mutate snapshots.

## Account lifecycle

`FinancialAccount.id` is stable within tenant structure; historical evidence uses the same id. **New** projection evidence for **archived** target accounts → `INSUFFICIENT` + `ACCOUNT_ARCHIVED`. No fuzzy name matching.

## Tests

`lib/finance/__tests__/finance-04b-03-evidence-sufficiency.test.ts`

## Next

**FIN-04B-04** — initial projection methodology engine (consumes this boundary).
