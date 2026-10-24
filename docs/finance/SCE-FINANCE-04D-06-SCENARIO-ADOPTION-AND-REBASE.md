# SCE-FINANCE-04D-06 — Scenario adoption and explicit rebase

## Purpose

Two explicit, tenant-visible governance actions:

1. **Adoption** — *Variante als aktuelle Prognose übernehmen* — promotes the scenario **result** to a new formal **Current Forecast** revision.
2. **Rebase** — *Ausgangsprognose aktualisieren* — replaces the scenario **frozen baseline** with today's Current Forecast while **preserving assumptions**.

Neither action is silent. Neither replaces the other.

## Adoption semantics

- Creates a new `FinanceForecastVersion` (CURRENT); prior CURRENT → SUPERSEDED.
- `revisionSource`: `SCENARIO_ADOPTION` (distinct from `AUTOMATIC_FORECAST_ADOPTION` and `MANUAL_REFORECAST`).
- Provenance: `FinanceScenarioAdoption` links `scenarioId`, `sourceScenarioUpdatedAt`, `sourceForecastVersionId`, `resultingForecastVersionId`.
- Scenario rows, assumptions, and frozen baseline are **not** mutated by adoption.
- Approved Budget, Actual, and Automatic Forecast are unchanged.

### Adoption account coverage (v1)

Implemented in `buildScenarioAdoptionPreview` (`lib/finance/forecast/scenario-adoption-policy.ts`):

- Accounts in the scenario frozen baseline → exact scenario calculated amount.
- Accounts only in today's Current Forecast → preserve current forecast amount (no silent delete/zero).
- Scenario baseline accounts absent from current forecast → included when the `FinancialAccount` still exists and is valid planning semantics.
- Missing/deleted accounts → adoption fails (`FINANCE_SCENARIO_ADOPTION_INVALID_ACCOUNT`).

### Concurrency

- `expectedScenarioUpdatedAt` — stale scenario edit → `FINANCE_SCENARIO_STALE`.
- `expectedCurrentForecastVersionId` — stale current forecast → `FINANCE_SCENARIO_STALE_CURRENT_FORECAST`.

### Outdated baseline

Adoption is **allowed** when the scenario source forecast version is older than today's Current Forecast. UI shows an explicit warning; adoption does **not** auto-rebase first.

## Rebase semantics

- Replaces all `FinanceScenarioBaselineLine` rows with a snapshot of today's Current Forecast lines.
- Updates `sourceForecastVersionId`, `baselineAsOfDate`, `baselineActualsThroughDate`.
- Assumptions unchanged (PERCENT_CHANGE, DELTA_AMOUNT, ABSOLUTE_AMOUNT, EXCLUDE_ACCOUNT preserved).
- Does **not** create a forecast revision or change Current Forecast.
- Audit: `FinanceScenarioRebase` (`fromForecastVersionId`, `toForecastVersionId`).

### Unmapped assumptions (v1)

If an assumption references an account not present in the new baseline → rebase blocked (`FINANCE_SCENARIO_REBASE_UNMAPPED_ASSUMPTIONS`).

### Availability

- Meaningful when `baselineFreshness === OUTDATED`.
- Blocked for archived scenarios and when Current Forecast is unavailable.

### Preview

`previewFinanceScenarioRebase` runs the FIN-04D-03 engine against a prospective baseline without persistence.

## Delete after adoption

`FinanceScenarioAdoption.scenarioId` uses `ON DELETE RESTRICT`. Hard delete is blocked (`FINANCE_SCENARIO_DELETE_BLOCKED_ADOPTION`); archive remains available.

## Permissions

- View preview/context: `finance.forecast.view`
- Adopt / rebase: `finance.forecast.manage`

## Timing boundary

Annual full-year amounts only — no effective dates, cash timing, phasing, or liquidity (see `SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`).

## Migration

`20261024180000_sce_finance_04d_06_scenario_adoption_rebase` — additive enum value + audit tables.

**STAGE migration verification (06U):** Applied on designated FC Allschwil STAGE Neon (`SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`, database `neondb`) with `APP_ENV=stage` and `SCE_DATA_ENVIRONMENT=STAGE` via guarded `scripts/sce-finance-04d-06-stage-migration-verify.ts --apply` (`APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled`, not `db push`). Pre/post finance row counts unchanged; existing UAT scenario *Mitglieder -10 %* preserved.

## Product Owner UAT (04D-06) — PASS

Michael validated on STAGE (FCA):

1. **Adoption** — *Als aktuelle Prognose übernehmen* on *Mitglieder -10 %*: confirmation explained formal forecast revision, scenario result vs today's Current Forecast, history preservation, budget/actual unchanged, scenario remains; after adoption Current Forecast matched scenario result; scenario stayed on frozen V3 baseline → **OUTDATED**; live comparison **0 CHF** (expected); contextual **Ausgangsprognose aktualisieren** shown.
2. **Rebase** — preview showed recalculated result with assumptions unchanged; after rebase **Basiert auf aktueller Prognose**, assumption still **Mitgliedsbeiträge −10%**, effect recalculated from new baseline; Current Forecast **not** modified by rebase.

UAT figures are evidence only — not hardcoded in product logic.

## FIN-04D-07 closure

- Lifecycle regression: `finance-04d-07-scenario-lifecycle-regression.test.ts`
- React `exhaustive-deps` warnings resolved in `FinanceScenarioGovernanceDialogs.tsx` (stable close callbacks)
- **04D-06 COMPLETE** — **04D-07 COMPLETE** — **FIN-04D READY FOR MERGE** (PR **#905** open; merge by Product Owner only)
