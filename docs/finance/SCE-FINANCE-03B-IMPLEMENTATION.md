# SCE-FINANCE-03B — Periodic Budget Control & Management Review

| Field | Value |
| --- | --- |
| **Package** | FIN-03B |
| **Status** | **COMPLETE + PO UAT PASS + MERGED TO STAGE** |
| **Branch** | `cursor/sce-finance-03b-periodic-budget-control` |
| **Target** | STAGE |
| **PR** | **#901** → **STAGE** |
| **PO UAT** | **PASS** — 2026-10-23 |

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

## Final architecture — measurement modes

| Mode | Behavior |
| --- | --- |
| **FULL_YEAR** | Entire finance year; full-year budget variance (FIN-03A) when in comparison mode |
| **YTD** | Finance year start through selected period/range end |
| **MONTH** | Single month or **contiguous FY-relative month range** (e.g. Jan 2026, Sep–Okt 2026) |
| **QUARTER** | FY-relative groups of three months; concise labels **Q1 2026**, **Q2 2026**, … for calendar-year FYs; equivalent FY-relative behavior for non-calendar **FinanceYear** boundaries |

**FinanceYear.name** remains the canonical tenant-owned year identity everywhere. Period labels (month names, ranges, quarter chips) are separate measurement labels — never substituted for **FinanceYear.name**.

## Period model contract

| Rule | Detail |
| --- | --- |
| Persisted period entity | **None** — no `FinanceMonth` / `AccountingPeriod` |
| Derivation | Months and quarters from **FinanceYear.startDate** / **endDate** |
| Month clipping | Calendar months overlapping the finance year, clipped to boundaries |
| Quarters | Consecutive groups of three finance-year months (not calendar Q1–Q4) |
| Range indices | `periodStartIndex` / `periodEndIndex` for contiguous month ranges |
| Legacy / quarter | `periodIndex` where required for quarter or legacy single-month URL |
| URL persistence | `?yearId=&mode=&periodStart=&periodEnd=` (and legacy `periodIndex`) |
| Single resolved range | Same inclusive boundaries for aggregation **and** Ist-Buchungen filtering |

Module: `lib/finance/actual/finance-measurement-period.ts`

## Contiguous range contract (R1 — accepted)

No Ctrl/Shift requirement. No arbitrary non-contiguous month sets in FIN-03B.

1. First click sets a single month.
2. Click a **later** month → extend range to `[start, click]`.
3. Click an **earlier** month → extend to `[click, end]`.
4. Click **inside** an existing range → collapse to that single month.
5. Reselect the **lone** selected month → unchanged.

## Budget reference contract

```text
YTD_BUDGET_VARIANCE_SUPPORTED = false
PERIOD_BUDGET_VARIANCE_SUPPORTED = false
```

Sub-year modes may show **Jahresbudget** / annual budget as **reference** only. They must **not** show fake monthly budget, prorated budget, fake period variance, or Günstig/Ungünstig based on annual budget vs partial actuals. Budget phasing belongs to later Finance work (not FIN-03B).

## Actual aggregation contract

| Concept | Rule |
| --- | --- |
| Selected period actual | Sum of actual entries within resolved **inclusive** period boundaries |
| YTD | Finance year start through selected period/range **end** (inclusive) |
| Ist-Buchungen list | Same measurement-context date filtering as summaries |
| Budget version rows | Actual entries remain independent of budget-version rows |

## Presentation semantics (R2 + R3)

Three separate concepts — do not conflate:

| Concept | Module | Rule |
| --- | --- | --- |
| **Finance result presentation** | `lib/finance/presentation/finance-result-presentation.ts` | Any calculated **net/result** (`income − expense`): **> 0** → SUCCESS typography, **< 0** → ERROR typography, **= 0** → neutral. API: `deriveFinanceResultPresentation(amountMinor)`, `financeResultSemanticTextClass(amountMinor)` |
| **Budget favorability** | `lib/finance/presentation/finance-variance-favorability-presentation.ts` | **FULL_YEAR** account **Abweichung / Bewertung** only (FIN-03A R5): FAVORABLE / UNFAVORABLE / ON_PLAN |
| **Account semantics** | Structure / reporting | INCOME and EXPENSE **amounts** are not auto success/danger-colored |

**Result sign** (income − expense) is distinct from **variance favorability** (budget comparison). Positive result ≠ favorable variance.

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

## PO UAT closure (2026-10-23)

Product Owner UAT **PASS** (Michael). Accepted product behavior:

**R1:** Cleaner period-selection hierarchy (Ganzes Jahr / YTD / Monat / Quartal); FY-relative month slicer; contiguous multi-month ranges (Sep–Okt style); compact Q1/Q2 quarter labels; URL-backed measurement context; **FinanceYear.name** preserved; single **Ist-Wert erfassen** CTA; no fake sub-year budget variance.

**R2:** **Ist-Ergebnis** semantic presentation — positive → success, negative → danger, zero → neutral; consistent across period/YTD/full-year; no duplicate negative-result management warning.

**R3:** Canonical Finance-wide result presentation — approved budget **Ergebnis**, Budget workspace result, and Ist result share the same semantics; income/expense remain neutral; result sign remains distinct from variance favorability.

Visual verification (Approved Budget FY 2026): Einnahmen **225'000 CHF**, Ausgaben **75'000 CHF**, Ergebnis **150'000 CHF** → **SUCCESS** semantics. Actual result **−13'500 CHF** → **DANGER** semantics.

**Production** was **not** promoted during FIN-03B closure.

## FIN-04 handoff (not implemented)

FIN-03B is foundation for **FIN-04** (rolling forecast & scenarios). FIN-04 may reuse: **FinanceYear** context, period resolver, month/range and quarter selection, resolved period boundaries, canonical Finance result presentation. **Do not** add Forecast models or budget phasing as part of FIN-03B.

## FIN-11 boundary

FIN-03B remains **management finance**. No general ledger, journals, debit/credit, accounting periods, statutory P&L, or balance sheet. **FinanceActualEntry** remains management actuals.

## Schema

```text
SCHEMA_CHANGE = NONE
NEW_MIGRATION = NONE
```

FIN-03B introduced no persistence changes. No database migrations at closure.

## Binary control compliance

```text
=== BINARY_CONTROL_COMPLIANCE ===
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES (SceSegmentedControl)
SINGLE_CHOICE_PATTERN = SEGMENTED_CONTROL
MULTI_SELECTION_PATTERN = CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION (unchanged)
```

## Closure validation (2026-10-23)

Recorded after final automated gates on branch `cursor/sce-finance-03b-periodic-budget-control` (see closure commit / PR **#901** checks).

| Gate | Result |
| --- | --- |
| FIN-01E / FIN-02 / FIN-03A / FIN-03B regression (16 files) | **PASS** (189 tests) |
| Design system governance | **PASS** (287 tests + governance scan) |
| Changed-path ESLint | **PASS** (0 errors; 4 pre-existing warnings on changed paths) |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | **PASS** |

## STAGE merge record

| Field | Value |
| --- | --- |
| **PR** | **#901** → **STAGE** |
| **R1 commit** | `d53fc57b` |
| **R2 commit** | `7b7cff8d` |
| **R3 commit** | `34756a81` |
| **PRODUCTION_PROMOTION** | **NO** |

Post-merge **MERGE_COMMIT** and **POST_MERGE_ORIGIN_STAGE** are recorded in the closure agent final report and updated here when merge completes.

## Roadmap linkage

| Item | Status |
| --- | --- |
| FIN-01A–E | COMPLETE |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-02 | COMPLETE |
| FIN-02D | DEFERRED / BACKLOG |
| FIN-03A | COMPLETE + PO UAT PASS |
| **FIN-03B** | **COMPLETE + PO UAT PASS** (PR **#901** → **STAGE**) |
| **FIN-03** | **COMPLETE** |
| FIN-04 | NOT STARTED |
