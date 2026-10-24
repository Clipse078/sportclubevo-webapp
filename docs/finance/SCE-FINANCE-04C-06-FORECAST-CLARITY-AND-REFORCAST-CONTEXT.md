# SCE-FINANCE-04C-06 — Forecast Clarity & Reforecast Context

| Field | Value |
| --- | --- |
| **Package** | FIN-04C-06 |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |
| **Status** | Code complete — PO UAT after STAGE migration when required |

## Product objective

FIN-04C-05 delivered a technically rich forecast workspace. FIN-04C-06 establishes a **durable cognitive hierarchy** on the same route (`/dashboard/finance/forecast`) without a new dashboard, scenarios (FIN-04D), or projection-engine changes.

## Locked principles

See `ROLLING_FORECAST_FIN_04C_06_CLARITY_PRINCIPLES` in [`SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md`](./SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md):

- Progressive disclosure — management meaning and exceptions first.
- SCE performs comparisons; users read conclusions first.
- **Current Forecast** remains dominant; **Automatic Forecast** is supporting intelligence.
- Budget variance may use favourability; **forecast revision history deltas stay neutral**.

## Workspace hierarchy

1. **Aktuelle Prognose** — result-first (`Erwartetes Ergibnis`), income/expense composition, budget & previous context in the header.
2. **Seit letzter Prognose** — quiet zero-change copy; non-zero result movement + bounded drivers.
3. **Gegen genehmigtes Budget** — result headline + top drivers (+ optional full positions).
4. **Konten** — collapsed account tables (FIN-04A editing preserved).
5. **Automatische Prognose** — aligned vs review conclusion; analytical detail behind disclosure.

## Prognoseverlauf

Collapsed summary (`N Versionen · zuletzt festgehalten …`) with **Verlauf anzeigen**. Expanded: evolution chart (or list fallback). No duplicate textual list when the chart carries the story.

## Reforecast context (optional)

**Neue Prognose festhalten** dialog:

- Default: **Datenstand** + optional **Bezeichnung** + amount preview (unchanged FIN-04C-05R4 lifecycle).
- **Weitere Angaben** (disclosure): optional `FinanceForecastRevisionReason`, optional context when `OTHER`, optional **Ist-Daten berücksichtigt bis** (defaults to Datenstand).

### Dialog layout (FIN-04C-06R2)

Formal reforecast dialogs use **natural content height** when the complete default workflow fits the viewport. Body scrolling is a fallback for constrained-height or expanded-detail states, never the default desktop presentation.

Progressive disclosure controls must visibly communicate interactivity; advanced financial metadata must not appear as an unlabeled/static-looking section (canonical button row + chevron, `aria-expanded`).

Persistence (additive migration `20261024140000_sce_finance_04c_06_revision_reason`):

- `revisionReason` — nullable enum
- `revisionContext` — nullable string (max 280 app-side)

Legacy versions remain null; no backfill.

## Datenstand vs actualsThroughDate

- `asOfDate` = management Datenstand.
- `actualsThroughDate` defaults to `asOfDate`; explicit earlier cutoff only in **Weitere Angaben**.
- Must satisfy finance-year bounds and `actualsThroughDate <= asOfDate`.

## FIN-04D boundary

No scenario UX, no scenario revisions in Prognoseverlauf, no LLM numerical forecasting.

## Validation

Focused coverage: `lib/finance/__tests__/finance-04c-06-forecast-clarity.test.ts` plus FIN-04C / FIN-04A / FIN-04B regression suites.
