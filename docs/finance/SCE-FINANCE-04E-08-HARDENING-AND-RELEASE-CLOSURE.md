# SCE-FINANCE-04E-08 — Hardening & release closure

| Field | Value |
| --- | --- |
| **Package** | FIN-04E-08 (final FIN-04E programme slice) |
| **Branch** | `cursor/sce-finance-04e-forecast-timing-f9d6` |
| **PR** | **#907** → **STAGE** (open — **DO NOT MERGE** without explicit Product Owner authorization) |
| **Status** | **COMPLETE** — automated closure PASS; merge pending PO review |

## Objective

Audit, harden, and document the full FIN-04E capability (04E-01 through 04E-07 + R1–R5 refinements) without new product features, without reopening PO-approved UX, and without starting FIN-05.

## Product Owner visual UAT (FIN-04E-07)

**Performed by:** Product Owner (desktop visual UAT).

**Recorded PASS for:**

- ZERO timing state
- PARTIAL / populated timing state
- Positive / negative financial direction presentation
- Expected-event management flows
- Revised Zeitplanung information architecture (Open Planning primary; analytical chart removed from Zeitplanung)
- Upcoming movements as verification context

**Not claimed:** automated agent manual browser UAT (Cursor performed automated tests and source audits only).

## Automated validation (FIN-04E-08)

| Area | Command / suite |
| --- | --- |
| FIN-04E focused | `npm run test -- lib/finance/__tests__/finance-04e` |
| Finance regression | `npm run test -- lib/finance` |
| Architecture guards | `finance-04e-expected-financial-event-architecture.test.ts` + package suites |
| Migration guards | `finance-04e-02-migration-deployment-guard.test.ts`, `finance-04e-06-migration-deployment-guard.test.ts` |
| Design system | `npm run test:design-system` |
| Lint | `npm run lint` |
| Build | `NODE_OPTIONS=--max-old-space-size=8192 npm run build` |

STAGE migration inventory scripts (`scripts/sce-finance-04e-02-stage-migration-verify.ts`, `scripts/sce-finance-04e-06-stage-migration-verify.ts`) remain **read-only** unless run in designated STAGE environment with explicit guards — **no production database mutation** in this package.

## Locked product contract (unchanged)

```text
ANNUAL EXPECTATION  ≠  EXPECTED FINANCIAL TIMING  ≠  EFFECTIVE-DATE ASSUMPTION
```

- **Current Forecast** remains annual authority (`currentVersionId` pointer).
- **FinanceExpectedFinancialEvent** rows are temporal evidence — not Actual, not forecast versions, not liquidity.
- **Unscheduled remainder** is derived at read/reconcile time — **not** persisted as synthetic events.
- **Scenario effective dates** are assumptions — they do **not** mutate expected events or Actual.
- **FIN-09** owns liquidity; **FIN-11** owns deeper accounting recognition semantics.

## Workspace boundaries (PO-approved R5)

| Surface | Role |
| --- | --- |
| **Zeitplanung** | **Manage** timing evidence — summary, Open Planning, upcoming movements, detail disclosures |
| **Finance Übersicht** | **Understand** — intended future primary consumer of expected-movement visualization |

**Overview movement visualization is not implemented in FIN-04E.** The R4 movement chart capability remains in code/tests for reuse; it is **not** mounted on Zeitplanung (`financeForecastTimingWorkspaceMountsMovementChart` → `false`).

## Programme status

| Subpackage | Status |
| --- | --- |
| 04E-01 | COMPLETE |
| 04E-02 | COMPLETE |
| 04E-03 | COMPLETE |
| 04E-04 | COMPLETE |
| 04E-05 | COMPLETE |
| 04E-06 | COMPLETE |
| 04E-07 (+ R1–R5) | COMPLETE (PO visual UAT PASS) |
| 04E-08 | COMPLETE |

**FIN-04E — COMPLETE**

**Next:** **FIN-05** (not started in this package).

## Test data

Existing shared STAGE UAT expected-event examples are **preserved** — no automatic cleanup, no new shared UAT seeding in R8.

## Code lock

`EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE` in `lib/finance/forecast/expected-financial-event-architecture-contract.ts`.

Automated guard: `lib/finance/__tests__/finance-04e-08-hardening-and-release-closure.test.ts`.
