# SCE-FINANCE-04A — Forecast Foundation & Current Forecast

| Field | Value |
| --- | --- |
| **Package** | FIN-04A |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
| **Branch** | `cursor/sce-finance-04a-forecast-foundation` |
| **Base** | `STAGE` (post FIN-03B merge `f2a28ec8`) |

## Purpose

Introduce the first forward-looking management measure: **current forecast** per `FinanceYear`, independent of approved budget and actual entries.

Management model:

- **Approved budget** — governance baseline
- **Actual** — what happened
- **Current forecast** — management expectation for the full financial year
- **Variance** — comparisons between measures (forecast vs budget in FIN-04A)

Scenarios (FIN-04B) and reporting publications (FIN-05/06) are not implemented here but storage supports stable version identity.

## Architecture decision — persistence

Mirror the budget **container + version + line** pattern with forecast-specific semantics (no approval workflow):

| Model | Role |
| --- | --- |
| `FinanceForecast` | One container per `(tenantId, financeYearId)` with `currentVersionId` pointer |
| `FinanceForecastVersion` | Stable version identity, `versionNumber`, `status` (`CURRENT` / `SUPERSEDED`), optional `scenarioKey` (null = canonical current; reserved for FIN-04B) |
| `FinanceForecastLine` | `(forecastVersionId, financialAccountId, amountMinor)` annual grain |

Forecast rows never update `FinanceBudget.currentBaselineVersionId`, `FinanceBudgetLine`, or `FinanceActualEntry`.

## Current forecast contract

- At most one **current** forecast per finance year (unique container + pointer).
- Edits mutate lines on the **current** version only.
- Future revisions can supersede versions without deleting history.

## Creation

Empty state: **Noch keine Prognose für {FinanceYear.name}** with **Prognose erstellen**.

Initialization modes:

1. **EMPTY** — empty working forecast (version 1, no lines).
2. **FROM_BASELINE** — copy amounts from current approved governance baseline (active income/expense accounts only).

If no approved baseline exists, budget initialization returns `FINANCE_FORECAST_NO_BASELINE` (no silent values).

## Grain / phasing

`FORECAST_PHASING_SUPPORTED = false` — full-year account grain only. No `/12` allocation or fake period forecast variance.

## Comparison formulas (forecast vs budget)

At account level (when approved baseline exists):

- `rawForecastDelta = forecast − budget`
- INCOME favorability = `rawForecastDelta`
- EXPENSE favorability = `budget − forecast`

Reuses FIN-03A favorability presentation tokens; does not apply to partial actual vs annual forecast.

## Actual vs forecast policy

YTD actual may appear as contextual reference elsewhere; FIN-04A **must not** label partial actual vs full-year forecast with Abweichung / Günstig / Ungünstig (`actual-forecast-policy.ts`).

## Permissions

| Key | Purpose |
| --- | --- |
| `finance.forecast.view` | View forecast workspace and overview slice |
| `finance.forecast.manage` | Create/edit forecast |
| `finance.admin` | Implies manage |

Catalog reconciliation: `reconcileFinanceForecastPermissionsForClubAdmin` (idempotent).

## Capability

`FORECASTING` — implemented in FIN-04A (`capability-registry.ts`). Tenant enablement remains separate from availability.

## UX

Workspace tab **Prognose** (`/dashboard/finance/forecast`) with local-first line editing (FIN-01D pattern). Overview shows **Genehmigtes Budget** and **Aktuelle Prognose** when capability and data exist.

## Migration

`20261023180000_sce_finance_04a_forecast_foundation`

**STAGE PO UAT prerequisite:** apply migration via guarded STAGE process (`docs/deployment/stage-preview-migration-runbook.md`) before functional UAT on shared STAGE. Preview builds do not apply migrations automatically.

Production: untouched.

## Tests

`lib/finance/__tests__/finance-04a-forecast-foundation.test.ts` plus FIN-01E / FIN-02 / FIN-03 regression suites.

## PO UAT plan (Michael)

1. Enable **FORECASTING** capability in Finanz-Einrichtung.
2. Open **Prognose** tab for current finance year.
3. Create forecast (empty and from approved baseline on a year with baseline).
4. Edit forecast lines — verify local responsiveness and persistence.
5. Confirm budget baseline and actuals unchanged.
6. Overview: approved budget + current forecast sections.
7. Verify forecast vs budget comparison columns when baseline exists.
8. Confirm no monthly forecast phasing.

## Roadmap state

- FIN-04 **IN PROGRESS**
- FIN-04A **IMPLEMENTED / PO UAT PENDING**
- FIN-04B **NOT STARTED**
