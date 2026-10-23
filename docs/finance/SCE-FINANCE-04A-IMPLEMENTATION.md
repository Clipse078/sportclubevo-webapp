# SCE-FINANCE-04A — Forecast Foundation & Current Forecast

| Field | Value |
| --- | --- |
| **Package** | FIN-04A — Current Forecast Foundation |
| **Status** | **COMPLETE + MERGED + PO UAT PASS** |
| **Branch** | `cursor/sce-finance-04a-forecast-foundation` |
| **PR** | **#902** → **STAGE** |
| **Base** | `STAGE` (post FIN-03B merge `f2a28ec8`) |

## Purpose

Introduce the first forward-looking management measure: **current forecast** per `FinanceYear`, independent of approved budget and actual entries.

## Locked forecast semantics

These distinctions are **canonical** for FIN-04 and downstream reporting (FIN-05):

| Measure | Meaning |
| --- | --- |
| **Approved budget** | Governance baseline — what the organisation **approved**. Forecast must **never** silently overwrite approved budget. |
| **Actual** | What **has happened**. Actual remains **independent** from forecast. |
| **Current forecast** | The organisation's **current accepted management expectation** for the finance year. Organisation-owned; may be manually adjusted. |

**Variance** in FIN-04A compares measures explicitly (forecast vs approved budget). Partial actual vs full-year forecast must not use budget-variance favorability semantics (`actual-forecast-policy.ts`).

Scenarios and SCE-generated projections are **not** FIN-04A; see programme split below.

## Canonical SCE projection principle

> **SCE generates the projection. The organisation owns the forecast.**

| Concept | Meaning |
| --- | --- |
| **SCE projection** | System-generated expectation based on available financial and operational evidence (FIN-04B+). |
| **Current forecast** | The organisation's accepted/current management expectation (FIN-04A). |
| **Scenario** | An alternative future assumption / what-if view (FIN-04D). |

The SCE projection must **never** silently overwrite the current forecast. The current forecast may later be initialized or updated from an SCE projection **only through an explicit user action**.

## Architecture decision — persistence

Mirror the budget **container + version + line** pattern with forecast-specific semantics (no approval workflow):

| Model | Role |
| --- | --- |
| `FinanceForecast` | One container per `(tenantId, financeYearId)` with `currentVersionId` pointer |
| `FinanceForecastVersion` | Stable version identity, `versionNumber`, `status` (`CURRENT` / `SUPERSEDED`), optional `scenarioKey` (null = canonical current; **future compatibility hook** for FIN-04D — not mandatory scenario schema) |
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

No additional closure migration. Production remains untouched.

## Tests

`lib/finance/__tests__/finance-04a-forecast-foundation.test.ts`, `finance-04a-r2-forecast-ux.test.ts`, `finance-04a-r1-migration-deployment-guard.test.ts`, plus FIN-01E / FIN-02 / FIN-03 regression suites.

## PO UAT closure (2026-10-23)

Product Owner UAT **PASS** (Michael). No further FIN-04A visual refinement required before closure.

Accepted product capabilities:

- Forecasting capability and dedicated **Prognose** workspace
- FinanceYear-specific forecasts; empty forecast creation; initialization from approved budget baseline
- Independent forecast values; forecast income / expense / result; forecast-vs-budget comparison with favorability and canonical result semantics
- Local-first editing; canonical money presentation; compact financial planning table UX
- Overview integration; stable forecast/version architecture; shared STAGE schema migration; permissions/capability integration

**Production** was **not** promoted during FIN-04A closure.

## FIN-04 programme split (roadmap)

| Subpackage | Focus | Status |
| --- | --- | --- |
| **FIN-04A** | Current Forecast Foundation | **COMPLETE + MERGED + PO UAT PASS** |
| **FIN-04B** | SCE Projection Engine | **IN PROGRESS** — **04B-01** architecture: [`SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md`](./SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md) |
| **FIN-04C** | Rolling Forecast & Reforecasting | **NOT STARTED** |
| **FIN-04D** | Scenarios & What-if | **NOT STARTED** |

**FIN-04** overall remains **IN PROGRESS** (04B–04D not started).

### FIN-04B direction (document only — not implemented)

FIN-04B introduces **SCE-generated projection** capability. The engine should progressively use appropriate evidence when available, including (non-exhaustive, not all required for v1):

- Historical actuals; current YTD actuals; monthly/periodic patterns; seasonality; historical FinanceYears
- Recurring income/expense patterns; known financial commitments
- Receivables/invoices when FIN-08 exists; operational/driver data when reliable and appropriate

Forecast/projection calculation is primarily **numerical / statistical / driver-based**. AI may later assist with explanation, interpretation, and anomaly/trend narratives — it must **not** replace deterministic financial calculation without explicit architecture approval. FIN-04B is **not** an LLM guessing financial values.

**Insufficient data principle:** SCE must not fabricate predictive precision. If insufficient evidence exists for a meaningful projection, the product must communicate clearly (conceptually: *Not enough data for a reliable SCE projection.*). Later UX may expose confidence, expected range, data sufficiency, and driver explanations — **not** in FIN-04A closure.

### FIN-04C direction (document only — not implemented)

Rolling forecast & reforecasting. Preserve:

- Approved budget remains immutable governance baseline
- Actuals progressively replace uncertainty as periods close
- Current forecast represents the latest accepted expectation
- No fake annual-budget / 12 phasing; any period forecast/phasing must have explicit semantics

### FIN-04D direction (document only — not implemented)

Scenarios & what-if. **Current forecast ≠ scenario.** Examples may include Base / Optimistic / Conservative / custom scenarios — do not hardcode these as mandatory schema semantics during FIN-04A closure. Nullable `scenarioKey` in FIN-04A remains a future compatibility hook only.

## FIN-05 compatibility (not implemented)

**FIN-05 — Financial Reporting & Intelligence** will later consume approved budget, actual, current forecast, and where appropriate SCE projection / scenario information **without conflating semantics**. Management P&L / Erfolgsrechnung remains in FIN-05.

## Binary control compliance

```text
=== BINARY_CONTROL_COMPLIANCE ===
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES (SceSegmentedControl / FINANCE_DESIGN_SYSTEM)
SINGLE_CHOICE_PATTERN = SEGMENTED_CONTROL
MULTI_SELECTION_PATTERN = CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION (unchanged programme rule)
```

## Closure validation

Recorded in the closure agent final report (FIN-04A tests, FIN-01E / FIN-02 / FIN-03 regression, design system governance, changed-path ESLint, production build).

## STAGE merge record

| Field | Value |
| --- | --- |
| **PR** | **#902** → **STAGE** |
| **Implementation commit** | `12ce1df9` |
| **R1 readiness commit** | `68ab832a` |
| **R2 UX commit** | `c202d9b6` |
| **PRODUCTION_PROMOTION** | **NO** |

Post-merge **FEATURE_HEAD**, **MERGE_COMMIT**, and **POST_MERGE_ORIGIN_STAGE** are recorded in the closure agent final report.

## Roadmap linkage

| Item | Status |
| --- | --- |
| FIN-01A–E | COMPLETE |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-02 | COMPLETE |
| FIN-02D | DEFERRED / BACKLOG |
| FIN-03 | COMPLETE |
| **FIN-04A** | **COMPLETE + PO UAT PASS** (PR **#902** → **STAGE**) |
| **FIN-04B** | **NOT STARTED** — SCE Projection Engine |
| **FIN-04C** | **NOT STARTED** — Rolling Forecast & Reforecasting |
| **FIN-04D** | **NOT STARTED** — Scenarios & What-if |
| **FIN-04** | **IN PROGRESS** |
| FIN-05 | NOT STARTED |
