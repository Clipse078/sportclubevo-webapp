# SCE-FINANCE-04A — Forecast Foundation & Current Forecast

| Field | Value |
| --- | --- |
| **Package** | FIN-04A |
| **Status** | **IMPLEMENTED / PO UAT IN PROGRESS** |
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

### FIN-04A R2 — Forecast Workspace UX Refinement

**PO UAT findings:** functionality acceptable; visual hierarchy, table density, money editing, and duplicate result presentation needed refinement.

| Decision | R2 implementation |
| --- | --- |
| Table density | Reuse FIN-03A `FinanceVarianceComparisonColGroup` (`FULL_YEAR`) — compact row padding, shared column geometry for Einnahmen/Ausgaben |
| Editable money cell | Borderless in-table cell; canonical `formatBudgetPlanningWholeMajorNumber` at rest; plain digits while focused; blur/Enter persist (FIN-01D) |
| Money formatting | Context strip shows **Währung**; table numeric cells omit repeated ISO suffix; summary strip retains canonical `formatBudgetPlanningMinor` with CHF |
| Variance | `formatBudgetPlanningSignedWholeMajorNumber` — explicit `+` / `−` / `0`; favorability text remains separate (Günstig / Ungünstig / Im Plan) |
| Summary hierarchy | Single compact `FINANCE_SUMMARY_STRIP_*` strip (Einnahmen / Ausgaben / Ergebnis with result semantics) |
| Duplicate result | Removed standalone **Prognose-Ergebnis** footer block below tables |
| Save state | Subtle indicator beside **Aktuelle Prognose · Version n** in context strip |
| Create modal | Segmented single choice retained; consequence copy per mode; default **Aus Budget starten** when baseline exists |
| Responsive | `table-fixed`, `min-w-0`, section `overflow-x-auto` — no full-viewport column stretch |

Status unchanged: **FIN-04A IMPLEMENTED / PO UAT IN PROGRESS** (Michael visual UAT).

## Migration

`20261023180000_sce_finance_04a_forecast_foundation`

### Shared STAGE migration (SCE-FIN-04A-R1)

| Field | Value |
| --- | --- |
| **SHARED STAGE MIGRATION** | **APPLIED** |
| **Date (Europe/Stockholm)** | 2026-10-23 |
| **Environment** | `APP_ENV=stage`, `SCE_DATA_ENVIRONMENT=STAGE` |
| **Database** | Neon `neondb` @ `ep-wispy-hall-aso93dy6…` |
| **Fingerprint** | `acd3b37682911890` |
| **Mechanism** | Guarded `npm run db:migrate:deploy-if-enabled` via `scripts/sce-finance-04a-r1-stage-migration-verify.ts --apply` |
| **Production** | Untouched |

**Pre-migration (existing Finance preserved):** tenants 47; `FinanceConfiguration` 1; `FinanceYear` 2; `FinancialAccount` 5; `FinanceBudget` 2; `FinanceBudgetVersion` 3; `FinanceBudgetLine` 15; `FinanceActualEntry` 1; forecast tables absent; failed migrations 0.

**Post-migration:** `FinanceForecast` / `FinanceForecastVersion` / `FinanceForecastLine` present; enum `FinanceForecastVersionStatus` = `CURRENT`, `SUPERSEDED`; migration history count = 1; forecast row counts 0; existing Finance counts unchanged; all forecast integrity checks 0.

**Permission reconciliation (Club Admin):** pre — 19 roles, missing `finance.forecast.view` 19, missing `finance.forecast.manage` 19; post — 0 missing (targeted `reconcileFinanceForecastPermissionsForClubAdmin`).

**Read smoke:** forecast Prisma select, finance configuration/currency, budget baseline pointer, `loadForecastWorkspaceSnapshot` — OK on shared STAGE.

Preview builds do not apply migrations automatically (`docs/deployment/stage-preview-migration-runbook.md`).

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
- FIN-04A **IMPLEMENTED / PO UAT IN PROGRESS**
- FIN-04B **NOT STARTED**
