# SCE-FIN-04B-05 / 05R1 / 05R2 — Prognose automatic forecast UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-05 (+ **05R1** dashboard / explainability, **05R2** terminology + presentation precision) |
| **Status** | **COMPLETE + MERGED + PO UAT PASS** (05 / 05R1 / 05R2) |
| **Route** | `/dashboard/finance/forecast` (tab **Prognose**) |

## Domain vs tenant terminology

| Layer | Term |
| --- | --- |
| Internal domain / persistence | **Projection** (`FinanceProjection`, `FinanceProjectionLine`, `SceProjectionExplainability`, …) |
| Tenant-facing German (system-generated) | **Automatische Prognose** |
| Tenant-facing German (organisation-owned) | **Aktuelle Prognose** |

SCE as a product prefix is **not** used in tenant-facing Finance forecast labels. Internal architecture may still reference SCE projection engine identifiers.

## Locked product principle

**The system generates the projection. The organisation owns the forecast.**

**NO UNEXPLAINED AUTOMATIC FORECAST.** Every non-null automatic forecast amount — and every deliberate non-prediction — must expose tenant-visible explainability derived from the same structured evidence/calculation that produced the persisted projection (not a parallel UI reconstruction).

## Presentation precision (05R2)

`AUTOMATIC_FORECAST_PRESENTATION_PRECISION = WHOLE_CURRENCY_UNIT`

- Tenant-facing **automatic forecast** amounts (KPI strip, charts, account table, explainability, deltas) display **whole currency units** via `formatFinanceAutomaticForecastMoneyMinor` / signed variants in `lib/finance/presentation/finance-money-presentation.ts`.
- **Internal `amountMinor`**, calculation engine output, confidence, ranges, and audit data remain at full minor-unit precision.

## Information architecture (Prognose)

1. Finance year / currency context strip
2. **Automatische Prognose** dashboard — Prognose-Einnahmen / Ausgaben / Ergebnis, Datenstand, coverage (only after a version exists), staleness, Prognosesicherheit notes when confidence varies by account
3. **Visual analysis** — finance-native charts (no third-party BI chrome):
   - Financial outlook: Ist bisher · Aktuelle Prognose · Automatische Prognose (optional Budget reference)
   - Composition ranked bars (income / expense accounts)
   - Largest deviations: automatic vs current forecast (neutral; omitted when insufficient comparable accounts)
4. **Account-level automatic forecast table** — projected amount, neutral delta vs Aktuelle Prognose, **Berechnung anzeigen**
5. **Aktuelle Prognose** — FIN-04A editable forecast workspace (unchanged ownership)

Automatic forecast is read-only. Adoption (**Automatische Prognose übernehmen**) remains **FIN-04B-06**.

## Charts and phasing

Charts represent **supported annual / cumulative actual data** and **annual** forecast/budget/automatic-forecast totals only.

**No synthetic future monthly phasing** — `FORECAST_PHASING_SUPPORTED` remains false.

## First use

Before the first generated version: intro copy + **Automatische Prognose erstellen** — **no** `0 von N Positionen prognostiziert` coverage line.

## Coverage

Pure helper: `computeProjectionAggregateCoverage`. Missing lines are not zero. Partial totals are labelled; Ergebnis withheld when incomplete.

## Explainability

View-models: `buildProjectionAccountExplainabilityDetail`, narratives in `projection-workspace-explainability.ts`.

Methodology labels: **Historischer Verlauf**, **Aktueller Verlauf**. Insufficient-data copy from sufficiency reason codes (no raw enums in UI).

## Permissions

| Capability | Permission |
| --- | --- |
| View dashboard + explainability | `finance.forecast.view` |
| Generate / refresh | `finance.forecast.manage` |

## Code map

| Area | Location |
| --- | --- |
| Workspace VM | `lib/finance/projection/projection-workspace-presentation.ts` |
| Dashboard VM | `lib/finance/projection/projection-workspace-dashboard.ts` |
| Explainability | `lib/finance/projection/projection-workspace-explainability.ts` |
| Automatic forecast money display | `lib/finance/presentation/finance-money-presentation.ts`, `lib/finance/projection/projection-amount-presentation.ts` |
| UI | `components/admin/finance/FinanceProjectionWorkspaceSection.tsx`, `components/admin/finance/projection/*Chart.tsx` |
| Query | `lib/finance/services/finance-projection-workspace-query-service.ts` |

## Tests

- `lib/finance/__tests__/finance-04b-05-projection-workspace.test.ts`
- `lib/finance/__tests__/finance-04b-05r1-projection-dashboard.test.ts`
- `lib/finance/__tests__/finance-04b-05r2-projection-terminology-precision.test.ts`
- `lib/finance/presentation/__tests__/finance-money-presentation.test.ts`
- `components/admin/finance/__tests__/FinanceProjectionDashboard.ux.test.tsx`

## Next

**FIN-04B-06** — Projection → Forecast adoption (after PO visual UAT).
