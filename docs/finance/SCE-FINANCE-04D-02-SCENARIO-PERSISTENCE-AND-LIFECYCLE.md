# SCE-FINANCE-04D-02 — Scenario Persistence & Lifecycle

| Field | Value |
| --- | --- |
| **Package** | FIN-04D-02 — persistence + domain lifecycle foundation |
| **Status** | **COMPLETE** (calculation engine FIN-04D-03 next) |
| **Branch** | `cursor/sce-finance-04d-scenarios-what-if` |
| **Migration** | `20261024160000_sce_finance_04d_02_scenario_persistence` |

## Scope

Implements durable **FinanceScenario** storage, frozen **baseline lines**, **assumption intent**, optimistic concurrency, and lifecycle (create, metadata edit, assumptions, archive, restore, delete, duplicate).

**Not in this package:** scenario calculation/read engine (04D-03), comparison UX (04D-04), workspace (04D-05), adoption/rebase (04D-06).

## Models

| Model | Role |
| --- | --- |
| `FinanceScenario` | Tenant + `FinanceYear` container; provenance `sourceForecastId` + `sourceForecastVersionId`; activity via `archivedAt` only |
| `FinanceScenarioBaselineLine` | Immutable frozen snapshot of current forecast lines at creation (`amountMinor` per `FinancialAccount.id`) |
| `FinanceScenarioAssumption` | One row per account (v1); typed `FinanceScenarioAssumptionKind` with conditional numeric payloads |

No `FinanceScenarioResultLine` (derived/recomputable). No `FinanceScenarioAdoption` (FIN-04D-06).

## Baseline snapshot

- Resolved through `FinanceForecast.currentVersionId` → current version lines (never `MAX(versionNumber)`).
- Optional `expectedCurrentForecastVersionId` on create; mismatch → `FINANCE_SCENARIO_STALE_CURRENT_FORECAST`.
- No current forecast → `FINANCE_SCENARIO_NO_CURRENT_FORECAST`.
- Transactional create: scenario + full baseline copy (zeros preserved).
- Provenance fields immutable in ordinary services.

## Assumptions

Kinds: `PERCENT_CHANGE` (basis points), `DELTA_AMOUNT`, `ABSOLUTE_AMOUNT`, `EXCLUDE_ACCOUNT`.

Validation uses FIN-04D-01 pure `applyScenarioAssumptionV1` against frozen baseline. New assumptions reject archived accounts (`FINANCE_SCENARIO_ACCOUNT_NOT_AVAILABLE`).

## Names

- Trimmed required name; blank rejected.
- Description blank → `null`.
- Active uniqueness: partial index `FinanceScenario_active_name_unique_idx` on `(tenantId, financeYearId, LOWER(TRIM(name))) WHERE archivedAt IS NULL`.
- Archived names may be reused; restore checks conflicts → `FINANCE_SCENARIO_NAME_CONFLICT`.

## Concurrency

`updatedAt` token on scenario row. Mutations use conditional `updateMany` on `(id, tenantId, updatedAt[, archivedAt IS NULL])` → `FINANCE_SCENARIO_STALE` when lost.

## Permissions

Reuse **FORECASTING**: `finance.forecast.view` (read), `finance.forecast.manage` (mutations).

## Deletion policy

Hard delete allowed when no adoption provenance exists (adoption table deferred). Baseline and assumptions **CASCADE** with scenario. Future adoption rows will **RESTRICT** delete.

## Duplicate

Fork: new id/name, same provenance + frozen baseline values + copied assumptions; does **not** re-resolve current forecast.

## Service entrypoints

`lib/finance/services/finance-scenario-service.ts`:

- `createFinanceScenario`
- `updateFinanceScenarioMetadata`
- `upsertFinanceScenarioAssumption` / `removeFinanceScenarioAssumption`
- `archiveFinanceScenario` / `restoreFinanceScenario` / `deleteFinanceScenario`
- `duplicateFinanceScenario`
- `getFinanceScenarioById`
- `assertFinanceScenarioBaselineMutationForbidden`

## STAGE migration

Generated locally; apply only via guarded `scripts/sce-finance-04d-02-stage-migration-verify.ts` (`APPLY_DATABASE_MIGRATIONS=true`). Production untouched.
