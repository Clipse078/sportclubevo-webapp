# SCE-FINANCE-04E-02 — Expected Event Persistence & Reconciliation

| Field | Value |
| --- | --- |
| **Package** | FIN-04E-02 — persistence & pure reconciliation foundation |
| **Status** | **COMPLETE** |
| **Branch** | `cursor/sce-finance-04e-forecast-timing-f9d6` |
| **ADR** | ADR-037 (extended) |
| **Next** | **FIN-04E-04** — read model (services: **FIN-04E-03** complete — [`SCE-FINANCE-04E-03-EXPECTED-EVENT-SERVICES.md`](./SCE-FINANCE-04E-03-EXPECTED-EVENT-SERVICES.md)) |

## Scope delivered

- Prisma model **`FinanceExpectedFinancialEvent`** (additive migration `20261024200000_sce_finance_04e_02_expected_event_persistence`).
- Pure domain validation (`validateExpectedFinancialEventPersistence`).
- Pure reconciliation engine (`reconcileExpectedFinancialTiming`).
- Architecture contract locks in `EXPECTED_FINANCIAL_EVENT_04E_02_ARCHITECTURE_LOCKS`.

**Out of scope (unchanged):** tenant CRUD/workspace UI (04E-05), effective-dated scenarios (04E-06), charts (04E-07), liquidity (FIN-09), FIN-05 reporting.

## Persistence model

| Concept | Decision |
| --- | --- |
| Model | `FinanceExpectedFinancialEvent` |
| Tenant | Required `tenantId` — all queries scoped by tenant |
| Finance year | Required `financeYearId` — **forecast ownership year** |
| Account | Required `financialAccountId` — direction derived from `FinancialAccount.canonicalSemantic` |
| Amount | `expectedAmountMinor` — safe integer, **non-negative magnitude** (INCOME/EXPENSE interpretation from account) |
| Direction column | **None** — no independent INCOME/EXPENSE on event |
| Timing precision (persisted) | `EXACT_DATE`, `MONTH`, `DATE_RANGE` only |
| UNSCHEDULED | **Not persisted** — remainder is derived at reconcile time |
| Source | `sourceKind` (`MANUAL` v1) + optional `sourceRefType` / `sourceRefId` (tenant-scoped opaque seam) |
| Idempotency | Partial unique index on `(tenantId, sourceKind, sourceRefType, sourceRefId)` when refs present |
| Audit | `createdAt`, `updatedAt`, `createdByUserId`, `updatedByUserId` |
| Delete behavior | `FinanceYear` / `FinancialAccount` → **RESTRICT** (preserve timing evidence); tenant cascade |

### Conditional timing fields

| Precision | Required | Forbidden |
| --- | --- | --- |
| `EXACT_DATE` | `expectedDate` (@db.Date) | month/range fields |
| `MONTH` | `expectedMonthStart` (YYYY-MM-01) | exact/range fields |
| `DATE_RANGE` | `rangeStartDate`, `rangeEndDate` (start ≤ end) | exact/month fields |

Domain validation enforces combinations — not UI-only.

### Business-date semantics

Expectation dates use **`DateTime @db.Date`** stored as UTC calendar midnight (same pattern as FIN-04C forecast revision dates). This prevents timezone shifts (e.g. 30.06 becoming 29.06). Audit timestamps remain `DateTime` with time.

### Cross–finance-year timing

An event belongs to a **`financeYearId`** but **`expectedDate` / range / month may fall outside** that year's calendar boundaries (e.g. FY2027 expectation with January 2028 settlement). Validation **does not** reject dates outside the finance year.

## Reconciliation

Pure function: `reconcileExpectedFinancialTiming`.

**Inputs (explicit — no system clock):**

- `annualForecastAmountMinor` — current forecast full-year amount (`null` if line absent)
- `actualThroughCutoffMinor` — authoritative actual sum through cutoff (FIN-03B read path in future services)
- `actualsThroughDateIso` — explicit cutoff (typically forecast revision `actualsThroughDate`)
- `expectedEvents` — timed evidence rows

**Formula (per account, positive magnitudes):**

```text
remainingFutureExpectation = max(0, annualForecast − actualThroughCutoff)
actualExceedsAnnualForecast = max(0, actualThroughCutoff − annualForecast)  // surfaced explicitly

timedFuture = sum(events classified FUTURE_TIMED)
ambiguousAtCutoff = sum(events classified AMBIGUOUS_AT_CUTOFF)
unscheduledRemainder = remainingFuture − timedFuture − ambiguousAtCutoff
```

**States:**

| State | Meaning |
| --- | --- |
| `BALANCED` | `unscheduledRemainder === 0` and not overallocated |
| `UNSCHEDULED_REMAINDER` | Positive unscheduled remainder — **no synthetic balancing rows** |
| `OVERALLOCATED` | Timed + ambiguous exceeds remaining — **forecast not mutated** |
| `FORECAST_LINE_ABSENT` | No annual forecast line — remainder not coerced to zero |

**Temporal classification (v1):**

- `EXACT_DATE`: future iff date **after** cutoff (inclusive cutoff day is not future).
- `MONTH`: future iff month entirely after cutoff month; same month as cutoff → **ambiguous** (no invented day).
- `DATE_RANGE`: future iff window starts after cutoff; overlap with cutoff → **ambiguous**.

## Architecture locks (machine-testable)

See `EXPECTED_FINANCIAL_EVENT_04E_02_ARCHITECTURE_LOCKS` in `lib/finance/forecast/expected-financial-event-architecture-contract.ts`.

## Permissions (deferred enforcement)

Likely reuse **`finance.forecast.view`** / **`finance.forecast.manage`** when 04E-03 services ship — no new permission family in 04E-02.

## Migration & STAGE

- Migration is **additive** only.
- **Not** auto-applied to Production.
- **STAGE apply** completed under FIN-04E-03 via `scripts/sce-finance-04e-02-stage-migration-verify.ts` (designated STAGE only; zero expected events created on shared STAGE).

## Code map

| Area | Path |
| --- | --- |
| Validation | `lib/finance/forecast/expected-financial-event-persistence-validation.ts` |
| Classification | `lib/finance/forecast/classify-expected-event-temporal-position.ts` |
| Reconciliation | `lib/finance/forecast/reconcile-expected-financial-timing.ts` |
| Tests | `lib/finance/__tests__/finance-04e-02-*.test.ts` |
