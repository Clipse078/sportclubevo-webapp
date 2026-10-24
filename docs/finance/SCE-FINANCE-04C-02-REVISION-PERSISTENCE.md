# SCE-FINANCE-04C-02 — Revision Persistence & Lifecycle

| Field | Value |
| --- | --- |
| **Package** | FIN-04C-02 — persistence + domain lifecycle foundation |
| **Status** | **COMPLETE** (FIN-04C-03 service/UI next) |
| **Migration** | `20261024120000_sce_finance_04c_02_forecast_revision_lifecycle` |
| **Code** | `lib/finance/services/finance-forecast-revision-service.ts`, `lib/finance/forecast/forecast-version-snapshot-transition.ts` |

## Schema extension (`FinanceForecastVersion`)

Additive, legacy-safe nullable fields:

| Field | Purpose |
| --- | --- |
| `asOfDate` | Datenstand — management information cutoff (UTC calendar date) |
| `actualsThroughDate` | Actual evidence included through date |
| `revisionSource` | `INITIAL_FORECAST` \| `MANUAL_REFORECAST` \| `AUTOMATIC_FORECAST_ADOPTION` |
| `revisionLabel` | Optional short management label |
| `previousVersionId` | Semantic lineage within the same `FinanceForecast` |
| `sourceProjectionVersionId` | Direct revision provenance when automatic forecast contributed |

Existing FIN-04A/04B rows keep **null** metadata where unknown — no backfill, no inferred cutoffs.

## Lifecycle primitive

`persistFormalForecastRevision` (internal — **not** tenant-facing):

1. Verify `FinanceForecast.currentVersionId === expectedCurrentForecastVersionId`
2. Validate revision dates within tenant `FinanceYear` (`actualsThroughDate ≤ asOfDate`)
3. Validate optional lineage / projection provenance (tenant + finance year scoped)
4. In one transaction (`executeForecastVersionSnapshotTransition`):
   - Mark prior CURRENT → **SUPERSEDED** (immutable)
   - Create new CURRENT with **full line snapshot** copied from accepted current state
   - Attach revision metadata on the **promoted CURRENT** version
   - Update `FinanceForecast.currentVersionId`

**Manual edit ≠ formal revision:** `upsertForecastLine` continues to mutate CURRENT in place.

## Provenance distinction

| Mechanism | Role |
| --- | --- |
| `FinanceForecastVersion.sourceProjectionVersionId` | Durable revision metadata on the forecast version |
| `FinanceProjectionAdoption` | Adoption **event/audit** record (FIN-04B unchanged authority) |

## FIN-04B adoption compatibility

`adoptProjectionForYear` reuses the shared snapshot transition and, for new adoptions after migration, sets:

- `revisionSource = AUTOMATIC_FORECAST_ADOPTION`
- `sourceProjectionVersionId` = adopted projection version
- `actualsThroughDate` from projection version (when available)
- `asOfDate` left null when not truthfully known

## Concurrency & duplicate submit

Stale `expectedCurrentForecastVersionId` → `FINANCE_FORECAST_REVISION_STALE_CURRENT` (409). A second formalization attempt against an already superseded version fails without creating Version N+2 spuriously.

## Permissions (04C-03)

This package does not add permissions. Tenant-facing enforcement of `finance.forecast.manage` belongs at the 04C-03 mutation boundary.

## STAGE migration

Guarded apply/read-only verify: `scripts/sce-finance-04c-02-stage-migration-verify.ts` (schema only — no forecast business data mutation).

## Next (FIN-04C-03)

Tenant-facing **Neue Prognose festhalten** service wiring on top of `persistFormalForecastRevision`.
