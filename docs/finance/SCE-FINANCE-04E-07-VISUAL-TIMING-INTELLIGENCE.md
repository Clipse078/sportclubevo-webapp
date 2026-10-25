# SCE-FINANCE-04E-07 — Visual timing intelligence

| Field | Value |
| --- | --- |
| **Package** | FIN-04E-07 |
| **Branch** | `cursor/sce-finance-04e-forecast-timing-f9d6` |
| **Status** | **IN PROGRESS** — **07R5** refocuses Zeitplanung composition; Übersicht chart integration **backlog** |

## Purpose

First temporal Finance visualization for Forecast Timing: evidence-backed expected movements, explicit untimed remainder, and restrained scenario effective-date context — **not** liquidity (FIN-09) and **not** synthetic monthly phasing.

## Visual grammar

| Semantic | Treatment |
| --- | --- |
| Expected income | Upper lane, success tone + label |
| Expected expense | Lower lane, danger tone + label |
| Untimed expectation | Dashed companion panel “Noch nicht terminiert” with income/expense split |
| Ambiguous at cutoff | Warning stroke / copy; position not coerced to exact date |
| Over-allocation | All events shown; warning copy; coverage bar capped with exception cue |
| Scenario effect | Segments BEFORE / AFTER / AMBIGUOUS / UNSCHEDULED — known impact separate from undetermined base |

Non-color cues: lane position, labels, dashed month outline, range bands, structured SR summary.

## Event precision rules

| Precision | Visual | Tooltip / detail |
| --- | --- | --- |
| `EXACT_DATE` | Point at business date | Locale exact day |
| `MONTH` | Dashed box + midpoint anchor | Month/year only — never day-1 as truth |
| `DATE_RANGE` | Horizontal band start–end | Range label; **no** day proration |

Plot anchors (`plotAnchorDateIso`) are internal to layout only.

## Data flow

1. `loadFinanceForecastTimingOverview` (FIN-04E-04) — reconciliation & coverage unchanged.
2. `buildFinanceForecastTimingVisualModel` — presentation-neutral markers + window + untimed totals.
3. `FinanceForecastTimingMovementTimeline` + `buildFinanceForecastTimingMovementChartModel` (07R4) — reusable zero-baseline movement chart; tenant formatting via existing presentation helpers.

No financial reconciliation in React. No `/12` or remaining-month smoothing.

## FIN-04E-07R5 — workspace responsibility

| Workspace | Role |
| --- | --- |
| **Finance Übersicht** (`/dashboard/finance`) | **Understand** — intended primary consumer of expected-movement visual intelligence (future FIN-05/09-wide pass) |
| **Zeitplanung** (`/dashboard/finance/forecast/timing`) | **Manage** timing evidence — summary, open planning, upcoming verification, detail disclosures |
| **Reporting** | Analyse / explain / publish (later) |
| **Einrichtung** | Configure |

**07R5 change:** the large analytical movement chart is **not** mounted on Zeitplanung. The R4 chart capability remains in code and tests for reuse. Drill-through from future Overview → Zeitplanung for maintenance is intended but **not implemented** in R5.

Zeitplanung hierarchy (when action is required): **Summary → compact untimed orientation (partial) → Offene Zeitplanung → Nächste erwartete Bewegungen → detail disclosures**.

Locks: `FINANCE_FORECAST_TIMING_WORKSPACE_04E_07R5_ARCHITECTURE_LOCKS`.

## Scenario integration

Inside existing scenario assumption row: `FinanceScenarioAssumptionTemporalVisual` when `effectiveFromDateIso` is set — compact segment bars from `FinanceScenarioAssumptionTemporalReadModel`. No synthetic expected events.

## Accessibility & responsive

- SR summary with timed / untimed amounts.
- Keyboard-focusable markers; focus panel mirrors tooltip content.
- Timeline scroll is intentional on narrow viewports; page avoids unbounded horizontal overflow.

## Reuse (future)

| Primitive | Future consumer |
| --- | --- |
| `FinanceVisualChartSurface` | FIN-05 P&L visuals |
| `FinanceVisualLegend` | FIN-09 liquidity (separate semantics) |
| `buildFinanceForecastTimingVisualModel` pattern | Budget/Actual timing enhancements |

Finance-wide visualization is **not** complete with 04E-07 — this is the first temporal foundation.

## Architecture locks

See `FINANCE_FORECAST_TIMING_VISUAL_04E_07_ARCHITECTURE_LOCKS` in `lib/finance/forecast/finance-forecast-timing-visual-architecture-contract.ts`.

## Boundaries

- **FIN-09:** No cash balance, cumulative curve, runway.
- **FIN-11:** Expected date is operational timing, not accounting recognition.
- **FIN-05:** Not started; primitives documented for reuse only.
