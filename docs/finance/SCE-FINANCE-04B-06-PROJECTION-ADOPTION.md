# SCE-FINANCE-04B-06 — Automatic Forecast → Current Forecast Adoption

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-06 |
| **Status** | **IMPLEMENTED / PO UAT REQUIRED** |
| **Branch** | `cursor/sce-finance-04b-projection-engine` |
| **PR** | #903 → STAGE |

## Product principle (locked)

> **SCE generates the projection. The organisation owns the forecast.**

| Domain | Tenant label |
| --- | --- |
| Organisation forecast (`FinanceForecast` current version) | **Aktuelle Prognose** |
| System projection (`FinanceProjection*`) | **Automatische Prognose** |
| Explicit adoption | **Automatische Prognose übernehmen** |

There is **no** automatic synchronisation from Automatische Prognose to Aktuelle Prognose. Adoption always requires an explicit user action after review.

**NO UNEXPLAINED AUTOMATIC FORECAST:** FIN-04B-05 explainability (`Berechnung anzeigen`) remains mandatory and unchanged by adoption.

## Version lifecycle

Adoption **creates a new** `FinanceForecastVersion`; it does **not** mutate the current version in place.

```text
Current forecast version N (CURRENT)
        ↓ user confirms adoption
Version N → SUPERSEDED
Version N+1 → CURRENT (full snapshot)
FinanceForecast.currentVersionId → N+1
FinanceProjectionAdoption → provenance row
```

Historical projection snapshots remain immutable. The prior forecast version remains reconstructable.

## Partial coverage policy

For each **ACTIVE** income/expense account:

| Projection line | Current forecast | New forecast line |
| --- | --- | --- |
| `projectedAmountMinor` set | any | **exact** `projectedAmountMinor` |
| null / missing | amount present | **preserve** current forecast amount |
| null / missing | no line | **no line** (never zero, never inferred) |

Canonical implementation: `buildProjectionAdoptionPreview` in `lib/finance/projection/projection-adoption-policy.ts`.

## Internal precision

Adoption persists **`projectedAmountMinor`** from the projection engine. UI whole-unit rounding (`formatFinanceAutomaticForecastMoneyMinor`) is presentation-only and must not be written back to storage.

## Stale projection guard

If FIN-04B-03 staleness evaluates to **STALE**, adoption is blocked with `FINANCE_FORECAST_ADOPTION_PROJECTION_STALE`. Users must run **Automatische Prognose aktualisieren** first; adoption does not trigger regeneration.

## Concurrency guard

The mutation carries expected `sourceForecastVersionId` and `projectionVersionId`. Inside the transaction the service verifies:

- `FinanceForecast.currentVersionId === expectedSourceForecastVersionId`
- `FinanceProjection.currentProjectionVersionId === expectedProjectionVersionId`

Mismatch → `FINANCE_FORECAST_ADOPTION_FORECAST_CHANGED` or `FINANCE_FORECAST_ADOPTION_PROJECTION_CHANGED`.

## Provenance

Each adoption creates **`FinanceProjectionAdoption`** with:

- `tenantId`, `financeProjectionId`, `projectionVersionId`
- `sourceForecastVersionId`, `targetForecastVersionId`
- `applyScope` = `WHOLE_FINANCE_YEAR` (first scope)
- `appliedAt`, `appliedByUserId`

## Permissions

| Action | Permission |
| --- | --- |
| View dashboard / explainability | `finance.forecast.view` |
| Generate / refresh / adopt | `finance.forecast.manage` |

Server-side enforcement in `finance-projection-adoption-service.ts` and existing projection generation paths.

## UI flow

- CTA on Automatische Prognose dashboard: **Automatische Prognose übernehmen** (manage only, fresh projection, eligible lines > 0).
- Confirmation dialog with impact summary; **no checkbox** confirmation.
- Success: compact message; Aktuelle Prognose workspace resolves to new version on refresh.

## Code map

| Concern | Location |
| --- | --- |
| Adoption policy / preview | `lib/finance/projection/projection-adoption-policy.ts` |
| Transactional adopt | `lib/finance/services/finance-projection-adoption-service.ts` |
| Staleness (shared) | `lib/finance/services/finance-projection-staleness-resolver.ts` |
| Server action | `app/(admin)/dashboard/finance/forecast/actions.ts` → `adoptProjectionAction` |
| UI | `components/admin/finance/FinanceProjectionWorkspaceSection.tsx` |

## Tests

`lib/finance/__tests__/finance-04b-06-projection-adoption.test.ts` — policy, lifecycle, partial coverage, precision, provenance, stale/concurrency guards, permissions, UX regression guards.
