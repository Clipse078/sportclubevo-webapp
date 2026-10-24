# SCE-FINANCE-04C-05R2 — Visual intelligence & whole-currency presentation

| Field | Value |
| --- | --- |
| **Package** | FIN-04C-05R2 PO UAT visual refinement |
| **Status** | **COMPLETE** (R2 + R3 closure) — PO UAT resumes on STAGE |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |
| **PR** | #904 → STAGE |

## Whole-currency management presentation

Finance management surfaces (forecast summaries, comparisons, history, formalization preview, automatic forecast charts, account table **read** mode) use **`formatFinanceManagementPlanning*`** / **`formatFinanceManagementMoneyMinor`**.

- Presentation only: internal `amountMinor`, calculations, adoption, and formalization snapshots stay at full minor precision.
- Rounding uses **`roundAmountMinorToWholeMajorPresentation`** (half away from zero at the ISO 4217 major-unit boundary).
- Zero-decimal currencies (e.g. JPY) follow ISO fraction digits via `iso4217MinorUnitsPerMajor`.
- Editable account inputs still accept whole-major typing via existing draft parsing; blur persistence unchanged.

## Visual hierarchy (forecast workspace)

1. **Context** — Finanzjahr, Währung  
2. **Aktuelle Prognose** — metadata + integrated income/expense/result + formalize CTA  
3. **Prognoseentwicklung** — revision progression chart + compact governance list  
4. **Veränderung seit letzter Prognose** — signed movement + largest account drivers  
5. **Gegen genehmigtes Budget** — governance baseline comparison + material drivers  
6. **Kontenbearbeitung** — FIN-04A tables (working layer)  
7. **Automatische Prognose** — FIN-04B intelligence (unchanged scope; aligned formatting)

Shared surfaces and spacing — no card soup.

## Prognoseentwicklung (forecast evolution)

- Primary title: **Prognoseentwicklung**  
- Data: **`FinanceForecastHistoryReadModel.entriesChronological`** (FIN-04C-04) — no second history query  
- **FIN-04C-05R3:** compact executive **revision timeline** (not a tall generic line chart); no unexplained horizontal gridlines  
- Each revision point shows **identity + whole-currency Ergebnis** without hover; **Aktuell** is the primary current marker (not color-only)  
- Single revision: no meaningless connector line; two+ revisions: progression legible on desktop and stacked on narrow viewports  
- **Revisionsübersicht** sits in the **same surface** below a thin separator (no detached metadata card)  
- Secondary metadata uses **`joinForecastMetadataTokens` / `buildForecastHistoryRowSecondaryLine`** so tokens like `Version 2` are never duplicated (`Version 2 · Version 2` regression fixed)  
- Legacy rows without `asOfDate` / `revisionLabel` / `revisionSource` remain **Frühere Prognose · Version n** (truthful; no invented dates)

## Change-driver visualization

Product question: *Was hat sich seit der letzten Prognose verändert?*

- Compact signed deltas for income, expense, result (mathematical direction only — no favorability coloring on drivers)  
- **`FinanceForecastChangeDriverBars`**: restrained horizontal diverging bars for largest absolute account deltas; zero-change accounts suppressed  
- **FIN-04C-05R3:** visible **zero axis** at bar midpoint (`data-finance-driver-zero-axis`); direction is mathematical (+/−) with signed value labels — no favorability coloring on drivers  

### Waterfall / bridge evaluation

The existing Finance chart stack is CSS/SVG bar primitives without an accessible waterfall primitive. Introducing a dedicated waterfall library for a single bridge would add weight and inconsistency.

**Decision:** use the shared **horizontal change-driver bars** for Previous → Current and Budget → Current driver stories. Totals movement remains in compact signed summary rows.

## Budget comparison

Section **Gegen genehmigtes Budget** — visually distinct (leading border accent) from previous-forecast change. Uses approved budget comparison read model only (no draft budget).

## Automatic forecast refinement

- Outlook chart labels use management whole-currency formatters for all series.  
- When all projection vs forecast account deltas are zero, **`chartDivergenceAligned`** calm state replaces empty zero bars.

## Responsive & accessibility

- Evolution timeline stacks vertically on narrow viewports; governance list remains compact in the shared surface.  
- Evolution includes sr-only summary table; revision points are keyboard focusable with full text labels (not hover-only).  
- Driver bars expose values as text labels (not color-only).

## FIN-04C-05R3 closure (PO visual polish)

| Area | R3 decision |
| --- | --- |
| Revision metadata | Deduplicated composition; governance secondary line from single helper |
| Timeline density | Replaced tall SVG line chart with compact revision evolution strip |
| Value scale | Directly labelled revision values; removed unexplained gridlines |
| History integration | Prognoseentwicklung + Revisionsübersicht in one projection surface |
| Change drivers | Explicit zero reference on diverging bars |
| Scope | No 04C-06 / 04D / scheduled cash / module-wide visual intelligence |

## 04C-06 boundary

Scenario UX, extended cutover dialogs, and FIN-04C-06 items remain **out of scope** for R2.

## Binary controls

**NEW_BINARY_CHECKBOXES = 0** — no new checkbox confirmations in R2.
