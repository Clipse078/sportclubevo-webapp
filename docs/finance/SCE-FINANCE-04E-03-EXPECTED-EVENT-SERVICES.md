# SCE-FINANCE-04E-03 — Expected financial event services

## Scope

Server-side application layer for **manual** `FinanceExpectedFinancialEvent` CRUD and the
reconciliation read service that connects persisted data to the FIN-04E-02 pure engine.

**In scope:** validation, tenant isolation, permissions, optimistic concurrency, source
ownership guards, list/read foundation, reconciliation application service, guarded STAGE
migration for FIN-04E-02 persistence.

**Out of scope:** timing workspace UX (04E-05), charts (04E-07), effective-dated scenarios
(04E-06), liquidity (FIN-09), FIN-05 reporting.

## Domain principle

Expected financial events are **timing evidence**. Manual CRUD must never silently change:

- Current Forecast (`FinanceForecast.currentVersionId` / line amounts)
- Approved Budget, Actual, Automatic Forecast, scenarios, or forecast history

## Services

| Operation | Function | Permission |
|-----------|----------|------------|
| Create | `createFinanceExpectedFinancialEvent` | `finance.forecast.manage` |
| Read | `getFinanceExpectedFinancialEvent` | `finance.forecast.view` |
| List | `listFinanceExpectedFinancialEvents` | `finance.forecast.view` |
| Update | `updateFinanceExpectedFinancialEvent` | `finance.forecast.manage` |
| Delete | `deleteFinanceExpectedFinancialEvent` | `finance.forecast.manage` |
| Reconciliation | `loadExpectedFinancialTimingReconciliation` | `finance.forecast.view` |

Capability: **FORECASTING** (same as FIN-04A–04D).

Implementation: `lib/finance/services/finance-expected-financial-event-service.ts`,
`lib/finance/services/finance-expected-financial-timing-reconciliation-service.ts`.

## Manual create input

- `financeYearId`, `financialAccountId`, `expectedAmountMinor`, timing precision + payload
- Optional `description`
- `sourceKind` is always **MANUAL**; server assigns tenant, actor, timestamps
- **Zero amounts rejected** for manual CRUD (persistence layer still allows zero for future
  source integrations)

## Tenant isolation

Finance year, financial account, and expected event ownership are validated on every operation.
Cross-tenant IDs are rejected with typed domain errors (no ID leakage).

## Finance year vs timing date

Events belong to a finance year for annual expectation context. **Timing dates may fall outside
that year** (e.g. FY2027 expectation with January 2028 payment date).

## Account policy

Income and expense posting accounts only. **New** manual events against **archived** accounts are
rejected (`FINANCE_FORECAST_ARCHIVED_ACCOUNT`). Existing events on archived accounts remain
readable/updatable/deletable when already present.

## Timing validation

Reuses `validateExpectedFinancialEventPersistence` (FIN-04E-02). Business dates as ISO
`YYYY-MM-DD` at the service boundary; stored as `@db.Date`.

## Optimistic concurrency

Updates and deletes require `expectedUpdatedAt` matching row `updatedAt`. Stale mutations return
`FINANCE_EXPECTED_EVENT_STALE` (409).

## Source ownership

- Generic manual CRUD applies only to `sourceKind = MANUAL` **without** `sourceRefType` /
  `sourceRefId`.
- Rows with source references are reserved for future FIN-07/08 integration
  (`FINANCE_EXPECTED_EVENT_SOURCE_MUTATION_FORBIDDEN`).
- Duplicate `(tenantId, sourceKind, sourceRefType, sourceRefId)` →
  `FINANCE_EXPECTED_EVENT_SOURCE_IDENTITY_CONFLICT`.

## Delete semantics

Deleting manual timing evidence does **not** reduce Current Forecast or Actual. Removed amounts
contribute to the **derived unscheduled remainder** in reconciliation. No synthetic balancing
events are created.

## Over-allocation policy

Mutations are **not** blocked when reconciliation would be `OVERALLOCATED`. The application
service surfaces truthful state; UX explains conflicts later.

## Reconciliation application service

`loadExpectedFinancialTimingReconciliation`:

1. Resolves **Current Forecast** only via `FinanceForecast.currentVersionId` (never
   `MAX(versionNumber)`).
2. Reads annual line amount for the account (`null` if line absent — not coerced to zero).
3. Sums **Actual** through cutoff using FIN-03B dated entries (`aggregateActualTotalsByAccount`).
4. Loads tenant/FY/account-scoped expected events and runs `reconcileExpectedFinancialTiming`.

**Cutoff rule:** defaults to current forecast version `actualsThroughDate`. Caller may supply
`actualsThroughDateIso` only when it **matches** that version context. No system clock.

## STAGE migration (FIN-04E-02 persistence)

Guarded verifier: `scripts/sce-finance-04e-02-stage-migration-verify.ts`

Migration: `20261024200000_sce_finance_04e_02_expected_event_persistence`

Requires designated STAGE identity (`APP_ENV=stage`, `SCE_DATA_ENVIRONMENT=STAGE`, canonical
fingerprint). Production is never targeted by this script.

## Architecture locks

See `EXPECTED_FINANCIAL_EVENT_04E_03_ARCHITECTURE_LOCKS` in
`lib/finance/forecast/expected-financial-event-architecture-contract.ts`.

## Next

**FIN-04E-04** — forecast timing read model & intelligence.
