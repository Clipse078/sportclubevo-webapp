# SCE-FINANCE-03B — Periodic Budget Control & Management Review

| Field | Value |
| --- | --- |
| **Package** | FIN-03B |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
| **Branch** | `cursor/sce-finance-03b-periodic-budget-control` |
| **Target** | STAGE |

## Product scope

Periodic **management measurement** and **management review** on top of FIN-03A actuals and FIN-02 approved baseline — without budget phasing, forecast, or accounting (FIN-11).

### Delivered

- Canonical **FinanceMeasurementPeriod** resolver (derived, not persisted)
- Modes: **FULL_YEAR**, **YTD**, **MONTH**, **QUARTER** (finance-year-relative quarters)
- Periodic actual aggregation (period + YTD context + annual baseline reference)
- Management review signals (factual, no fake period/YTD budget variance)
- Extended **Finanzen → Ist** workspace (period navigation, URL `mode` + `periodIndex`)
- Account tables: full-year variance unchanged; period modes show **Zeitraum Ist / YTD Ist / Jahresbudget**
- Ist-Buchungen filtered by selected measurement context

### Explicitly out of scope

- Budget phasing / monthly allocation
- Period or YTD **budget variance**
- Rolling forecast / scenarios (FIN-04)
- GL, journals, period close (FIN-11)

## Architecture

| Topic | Decision |
| --- | --- |
| Period entities | **None** — months/quarters derived from `FinanceYear.startDate` / `endDate` |
| Identity | Always **`FinanceYear.name`** for year context; period label separate (e.g. month name) |
| Budget comparison | Full-year variance only when `mode=FULL_YEAR`; otherwise annual budget is **reference** |
| YTD in month/quarter | Actuals from year start through **period end** (inclusive) |
| Permissions | Reuse `finance.actual.view` / `finance.actual.manage` / `finance.admin` |
| Capability | Reuse **ACTUALS** |

## Period resolver

Module: `lib/finance/actual/finance-measurement-period.ts`

- Calendar months overlapping the finance year, clipped to boundaries
- Quarters = consecutive groups of three finance-year months (not calendar Q1–Q4)
- URL: `?yearId=&mode=month|quarter|ytd&periodIndex=`

## Schema

```text
SCHEMA_CHANGE = NONE
NEW_MIGRATION = NONE
```

## Binary control compliance

```text
=== BINARY_CONTROL_COMPLIANCE ===
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES (SceSegmentedControl)
SINGLE_CHOICE_PATTERN = SEGMENTED_CONTROL
MULTI_SELECTION_PATTERN = CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION (unchanged)
```

## Roadmap linkage

| Item | Status |
| --- | --- |
| FIN-01A–E | COMPLETE |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-02 | COMPLETE |
| FIN-02D | DEFERRED / BACKLOG |
| FIN-03A | COMPLETE + PO UAT PASS |
| **FIN-03B** | **IMPLEMENTED / PO UAT PENDING** |
| FIN-03 | IN PROGRESS |
| FIN-04 | NOT STARTED |
