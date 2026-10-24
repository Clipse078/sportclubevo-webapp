# SCE-FINANCE-04E-05 — Forecast Timing Workspace UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04E-05 |
| **Branch** | `cursor/sce-finance-04e-forecast-timing-f9d6` |
| **Route** | `/dashboard/finance/forecast/timing` |
| **Code** | `components/admin/finance/timing/*`, `app/(admin)/dashboard/finance/forecast/timing/*`, `lib/finance/forecast/expected-financial-event-timing-presentation.ts` |

## Purpose

First tenant-facing Forecast Timing workspace: simple management understanding over the FIN-04E domain (persistence 04E-02, services 04E-03, read model 04E-04).

## Information hierarchy

1. **Summary** — remaining expectation, timed / untimed split, coverage bar, calm interpretation.
2. **Next expected movements** — decision-useful upcoming list (read-model limit, no invented phasing).
3. **Open timing (attention accounts)** — ranked by 04E-04 account ordering; balanced accounts under disclosure.
4. **Maintenance on demand** — all events table, account detail expanders, create/edit/delete modals.

## Forecast context

Integrated as a third Forecast sub-tab (**Aktuelle Prognose · Szenarien · Zeitplanung**). No new top-level Finance nav item.

## Tenant terminology

Uses natural German copy (`Zeitplanung`, `Noch erwartet`, `Zeitlich eingeplant`, `Noch nicht terminiert`). Internal types (`FinanceExpectedFinancialEvent`, reconciliation state names) stay in code/tests only.

## Permissions

- `finance.forecast.view` — view workspace (server + page gate).
- `finance.forecast.manage` — create/edit/delete manual events; view-only hides mutation CTAs.

## Modal flows

- **Create / edit** — account (create only), amount, timing (`Genaues Datum` / `Monat` / `Zeitraum` via segmented control), optional description.
- **Delete** — confirmation; copy states annual forecast unchanged.
- **Errors** — domain codes mapped to calm German messages (stale, invalid account/amount/timing, source-owned).

## Visual boundaries (deferrals)

- No FIN-04E-07 charts (simple coverage bar only).
- No fake monthly allocation (`/ 12`).
- No liquidity language.
- No FIN-04D scenario effective-date controls.

## Tests

- `lib/finance/__tests__/finance-04e-05-forecast-timing-workspace-ux.test.ts` — structure, navigation, boundaries.
- `lib/finance/__tests__/finance-04e-05-timing-presentation.test.ts` — timing precision display.

## Related docs

- [SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md](./SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md)
- [SCE-FINANCE-04E-04-FORECAST-TIMING-READ-MODEL.md](./SCE-FINANCE-04E-04-FORECAST-TIMING-READ-MODEL.md)
