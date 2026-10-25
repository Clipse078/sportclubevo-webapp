# SCE-FINANCE-04E-06 — Effective-dated scenario integration

| Field | Value |
| --- | --- |
| **Package** | FIN-04E-06 |
| **Status** | **COMPLETE** (implementation) |
| **Branch** | `cursor/sce-finance-04e-forecast-timing-f9d6` |
| **Related** | [FIN-04E architecture](./SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md), [FIN-04D scenarios](./SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md), [Timing principles](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) |

## Locked principle

An **effective date** changes which **future expected financial events** an assumption applies to. It does **not** turn an annual forecast into daily/monthly phasing, does **not** mutate Actual, and does **not** mutate `FinanceExpectedFinancialEvent` rows during scenario calculation.

## Annual vs temporal semantics

| Mode | `effectiveFromDate` | Engine |
| --- | --- | --- |
| FIN-04D full scope | `null` | Frozen baseline + annual assumption transform (unchanged) |
| FIN-04E-06 temporal | non-null date | Expected-event timing evidence + eligible event transforms |

## Support matrix (v1)

| Assumption kind | Effective date |
| --- | --- |
| `PERCENT_CHANGE` | Supported |
| `EXCLUDE_ACCOUNT` | Supported |
| `DELTA_AMOUNT` | **Not supported** (server validation) |
| `ABSOLUTE_AMOUNT` | **Not supported** (server validation) |

## Temporal coverage states

Presentation-neutral states (not statistical confidence):

- `COMPLETE` — full remaining future expectation is classifiable; deterministic annual scenario amount
- `PARTIAL` — unscheduled remainder cannot be allocated before/after effective date
- `AMBIGUOUS` — month/range overlap with effective date without invented day precision
- `NO_TIMING_EVIDENCE` — remaining expectation exists but no future timed events

When coverage is not `COMPLETE`, adoption to Current Forecast is **blocked** with typed domain errors.

## Classification rules (summary)

- **EXACT_DATE** — compare calendar dates; on/after effective → affected
- **MONTH** — no fake day; month fully before/after, or month-start effective on 1st → affected; mid-month effective in same month → ambiguous
- **DATE_RANGE** — overlap with effective → ambiguous (no proportional split)

## Persistence

Additive migration: nullable `FinanceScenarioAssumption.effectiveFromDate` (`DATE`).

## Boundaries

- **FIN-04E-07** — charts deferred
- **FIN-09** — liquidity deferred
- **Actual / expected events** — immutable inputs to scenario calculation

Code locks: `EFFECTIVE_DATED_SCENARIO_ARCHITECTURE_LOCKS` in `effective-dated-scenario-architecture-contract.ts`.
