# SCE-FINANCE-03B — Periodic Budget Control & Management Review

| Field | Value |
| --- | --- |
| **Package** | FIN-03B |
| **Status** | **IMPLEMENTED / PO UAT IN PROGRESS** |
| **Branch** | `cursor/sce-finance-03b-periodic-budget-control` |
| **Target** | STAGE |

## Product scope

Periodic **management measurement** and **management review** on top of FIN-03A actuals and FIN-02 approved baseline — without budget phasing, forecast, or accounting (FIN-11).

### Delivered

- Canonical **FinanceMeasurementPeriod** resolver (derived, not persisted)
- Modes: **FULL_YEAR**, **YTD**, **MONTH**, **QUARTER** (finance-year-relative quarters)
- Periodic actual aggregation (period + YTD context + annual baseline reference)
- Management review signals (factual, no fake period/YTD budget variance)
- Extended **Finanzen → Ist** workspace (period slicers, URL `mode` + `periodStart` / `periodEnd`)
- **FIN-03B-R1 (PO UAT refinement):** compact two-row toolbar, month/quarter slicers, contiguous month ranges
- **FIN-03B-R2 (PO UAT refinement):** canonical result semantic coloring for **Ist-Ergebnis** (period, YTD companion block, full-year summary); income/expense amounts stay neutral
- **FIN-03B-R3 (PO UAT refinement):** **finance-wide** canonical **FINANCE RESULT PRESENTATION** — any calculated net/result value (Overview approved budget **Ergebnis**, Budget **Geplantes Ergebnis**, Ist **Ist-Ergebnis**) shares one helper; income/expense line amounts stay neutral
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
- URL: `?yearId=&mode=month|quarter|ytd&periodStart=&periodEnd=` (legacy `periodIndex` → single month)
- Month range: finance-year-relative inclusive indices; aggregation spans `startDate` of first month through `endDate` of last month
- Quarter labels: **Q1…Q4** with calendar year of quarter start (FY-relative grouping, not calendar Q1–Q4)

### Month range interaction (no modifier keys)

1. First click sets a single month.
2. Click a later month → extend range to `[start, click]`.
3. Click an earlier month → `[click, end]`.
4. Click inside an existing range → collapse to that single month.
5. Click the only selected month again → unchanged.

### FIN-04 compatibility (not implemented)

`periodStartIndex` / `periodEndIndex` (or resolved `startDate` / `endDate`) can later anchor forecast horizon, rolling windows, scenario comparison, and budget phasing without new persisted period entities.

### FIN-11 boundary

Unchanged: no ledger, journals, or statutory accounting periods — `FinanceActualEntry` remains management actuals.

## Presentation semantics (R2 + R3)

Three separate concepts — do not conflate:

| Concept | Module | Rule |
| --- | --- | --- |
| **Finance result presentation** | `lib/finance/presentation/finance-result-presentation.ts` | Any calculated **net/result** (`income − expense`): **> 0** → SUCCESS typography, **< 0** → ERROR typography, **= 0** → neutral. API: `deriveFinanceResultPresentation(amountMinor)`, `financeResultSemanticTextClass(amountMinor)` |
| **Budget favorability** | `lib/finance/presentation/finance-variance-favorability-presentation.ts` | **FULL_YEAR** account **Abweichung / Bewertung** only (FIN-03A R5): FAVORABLE / UNFAVORABLE / ON_PLAN |
| **Account semantics** | Structure / reporting | INCOME and EXPENSE **amounts** are not auto success/danger-colored |

`YTD_BUDGET_VARIANCE_SUPPORTED = false` and `PERIOD_BUDGET_VARIANCE_SUPPORTED = false` remain unchanged — sub-year modes do not gain Günstig/Ungünstig.

### Surfaces using finance result presentation (R3 inventory)

| Surface | Location | Result field |
| --- | --- | --- |
| Finance Overview | `FinanceOverviewPanel.tsx` | Approved baseline **Ergebnis** |
| Budget workspace | `FinanceBudgetWorkspacePanel.tsx` | Governance baseline + working/draft **Geplantes Ergebnis** |
| Ist workspace | `FinanceActualsWorkspacePanel.tsx` | Period / YTD / full-year **Ist-Ergebnis** |

Domain/read models (e.g. FIN-01E `reporting-read-model.ts`) expose numeric `resultMinor` only — presentation stays in UI/presentation modules.

### R2 PO UAT finding

Periodic summaries were visually too neutral: negative **Ist-Ergebnis** (e.g. Sep–Okt 2026, **−13'500 CHF**) did not stand out. Resolution: semantic danger/success on the **result value** via `deriveFinanceResultPresentation(amountMinor)`. Redundant text signal *«Das YTD-Ist-Ergebnis ist negativ.»* removed once the YTD **Ist-Ergebnis** KPI carries the same meaning. Remaining management hints (e.g. budget accounts without YTD activity) use small INFO icon + muted text.

### R3 PO UAT finding

R2 semantics were correct in **Ist** but **Overview** (Genehmigtes Budget **Ergebnis**) and **Budget** summaries still used neutral typography for positive/negative results. R3 generalizes the same helper finance-wide. **Positive result ≠ favorable variance** — e.g. approved budget **+150'000 CHF** is success-colored because the result is positive; expense **FAVORABLE** variance still comes from `finance-variance-favorability-presentation.ts`.

### Future compatibility (not implemented)

| Module | Result label (examples) | Same helper |
| --- | --- | --- |
| FIN-04 Forecast | Forecast-Ergebnis | Yes |
| FIN-04 Scenario | Scenario-Ergebnis | Yes |
| FIN-05 Management P&L | Periodenergebnis / Ergebnis | Yes |
| FIN-11 statements | Calculated profit/loss where semantically appropriate | Reuse when presented as management result |

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
| **FIN-03B** | **IMPLEMENTED / PO UAT IN PROGRESS** |
| FIN-03 | IN PROGRESS |
| FIN-04 | NOT STARTED |
