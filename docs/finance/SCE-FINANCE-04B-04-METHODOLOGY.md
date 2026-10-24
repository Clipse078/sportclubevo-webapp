# SCE-FINANCE-04B-04 — Initial projection methodology engine

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-04 |
| **Status** | **IMPLEMENTED** |
| **Engine version** | `sce-projection-v1` |
| **Shared STAGE migration (04B-04)** | **APPLIED TO SHARED STAGE** (`20261023210000_sce_finance_04b_04_projection_line_methodology`) |

## Purpose

First deterministic SCE projection calculator: per-account methodology selection, annual `projectedAmountMinor` (or `null`), confidence, optional range, immutable snapshot persistence via FIN-04B-02.

Principle unchanged: **SCE generates the projection. The organisation owns the forecast.**

## Orchestrator

`generateFinanceYearProjection` — `lib/finance/services/finance-projection-generation-service.ts`

Pipeline: validate tenant/year/currency → cutoff → load accounts → evidence + sufficiency → select methodology per account → calculate → confidence → persist snapshot.

Default cutoff when omitted: **UTC calendar today** (`YYYY-MM-DD`).

## Methodology hierarchy (conservative)

Per `FinancialAccount` (not tenant-global):

1. **HISTORICAL_PATTERN** — median cumulative seasonal share through completed current periods
2. **RUN_RATE** — finance-year day elapsed extrapolation (explicit, conservative)
3. **NONE** — no reliable projection (`projectedAmountMinor = null`)

Not used as predictive intelligence: `BASELINE_REFERENCE`, current forecast, budget alone.

## Historical pattern

- Compare **finance-year-relative** period indexes only (FIN-03B months).
- **Completed** current periods contribute to scaling numerator and historical share denominator.
- **Partial** current month: actuals count toward **known actual**; period is **excluded** from seasonal share comparison (not treated as a full month).
- Multiple historical years: **median** cumulative share (basis points), not mean — robust to one abnormal year.
- Annual estimate: `round(completedCurrentActual × 10000 / medianShareBp)` (integer half-away-from-zero).
- Enforce `projectedAmountMinor >= knownActualAmountMinor` for income/expense planning semantics.
- Optional range when ≥2 historical years: min/max implied annual from each year's share (null otherwise).

## Run rate

Eligibility (all required):

- General sufficiency ≠ `INSUFFICIENT`
- ≥2 completed current periods with actuals
- ≥14 elapsed finance-year days through cutoff
- ≥8% of finance-year days elapsed
- Known actual > 0

Formula: `round(knownActual × totalFinanceYearDays / elapsedDays)`.

Confidence typically **LOW** (explicit `RUN_RATE` rationale codes).

## No projection

When sufficiency is `INSUFFICIENT` or no methodology is safely eligible. Never substitute **zero** for unknown.

## Per-account vs version methodology

| Level | Field | Semantics |
| --- | --- | --- |
| **Line** | `methodologyFamily`, `dataSufficiency`, `confidence` | Authoritative per account |
| **Version** | `methodologyFamily` | `MIXED` when lines differ; otherwise single family |
| **Version** | `dataSufficiency` | Rollup: uniform level, else `LIMITED` |
| **Version** | `confidence` | Minimum (worst) across lines |

Migration: `20261023210000_sce_finance_04b_04_projection_line_methodology` (does not edit 04B-02 migration).

## Confidence (deterministic)

Central rules: `lib/finance/projection/projection-confidence.ts`

- **NONE** — `NONE` methodology
- **LOW** — run rate; single historical year; volatile pattern
- **MEDIUM** — default historical pattern; moderate dispersion
- **HIGH** — ≥2 historical years and **STABLE** pattern (spread ≤1500 bp)

Pattern stability: `lib/finance/projection/projection-pattern-stability.ts` (spread of cumulative share basis points).

## Rounding

Integer minor units only; rational math via `bigint` in `projection-integer-math.ts`.

## Module map

| Module | Role |
| --- | --- |
| `projection-methodology-eligibility.ts` | Selection + thresholds |
| `projection-historical-pattern.ts` | Seasonal scaling |
| `projection-run-rate.ts` | Elapsed-day annualisation |
| `projection-account-calculator.ts` | Per-account orchestration |
| `projection-version-rollup.ts` | Version aggregates |

## Tests

`lib/finance/__tests__/finance-04b-04-methodology-engine.test.ts`

## Roadmap

| Package | Status |
| --- | --- |
| FIN-04B-04 | **IMPLEMENTED** |
| FIN-04B-05 | UI (next) |
| FIN-04B | **IN PROGRESS** |
