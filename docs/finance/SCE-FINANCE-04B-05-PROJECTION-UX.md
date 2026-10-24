# SCE-FIN-04B-05 / 05R1 — Prognose SCE projection intelligence UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-05 (+ **05R1** dashboard / explainability refinement) |
| **Status** | **FIN-04B-05R1 IMPLEMENTED / PO UAT REQUIRED** |
| **Route** | `/dashboard/finance/forecast` (tab **Prognose**) |

## Locked product principle

**SCE generates the projection. The organisation owns the forecast.**

**NO UNEXPLAINED SCE PROJECTION.** Every non-null SCE predicted amount — and every deliberate non-prediction — must expose tenant-visible explainability derived from the same structured evidence/calculation that produced the persisted projection (not a parallel UI reconstruction).

## Information architecture (Prognose)

1. Finance year / currency context strip
2. **SCE-Projektion intelligence dashboard** — projected Einnahmen / Ausgaben / Ergebnis, Datenstand, coverage (only after a version exists), staleness, Prognosesicherheit notes when confidence varies by account
3. **Visual analysis** — finance-native charts (no third-party BI chrome):
   - Financial outlook: Ist bisher · Aktuelle Prognose · SCE-Projektion (optional Budget reference)
   - Composition ranked bars (income / expense accounts)
   - Forecast vs SCE divergence (neutral; omitted when insufficient comparable accounts)
4. **Account-level SCE detail table** — projection amount, neutral delta vs Prognose, explainability affordance
5. **Aktuelle Prognose** — FIN-04A editable forecast workspace (unchanged ownership; not styled as equivalent editable SCE)

SCE is read-only. Adoption (**SCE-Projektion übernehmen**) remains **FIN-04B-06**.

## Charts and phasing

Charts represent **supported annual / cumulative actual data** and **annual** forecast/budget/SCE totals only.

**No synthetic future monthly SCE phasing** — `FORECAST_PHASING_SUPPORTED` remains false; do not distribute annual projections across remaining months.

## First use

Before the first generated version: intro copy + **SCE-Projektion erstellen** — **no** `0 von N Positionen projiziert` coverage line.

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
| UI | `components/admin/finance/FinanceProjectionWorkspaceSection.tsx`, `components/admin/finance/projection/*Chart.tsx` |
| Query | `lib/finance/services/finance-projection-workspace-query-service.ts` |

## Tests

- `lib/finance/__tests__/finance-04b-05-projection-workspace.test.ts`
- `lib/finance/__tests__/finance-04b-05r1-projection-dashboard.test.ts`
- `components/admin/finance/__tests__/FinanceProjectionDashboard.ux.test.tsx`

## Next

**FIN-04B-06** — Projection → Forecast adoption (after PO visual UAT).
