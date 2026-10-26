# SCE-FINANCE-07 — Commitments & Approvals

| Field | Value |
| --- | --- |
| **Programme** | FIN-07 — Commitments & Approvals |
| **Package** | **FIN-07A** — Commitment Domain Foundation & Approval Architecture |
| **Status** | **FIN-07 IN PROGRESS** — **07A IMPLEMENTED / FOUNDATION REVIEW** (PR open → **STAGE**) |
| **Predecessor** | **FIN-06 COMPLETE / PO APPROVED** (closure — [`SCE-FINANCE-06H-PROGRAMME-CLOSURE.md`](./SCE-FINANCE-06H-PROGRAMME-CLOSURE.md)) |
| **Architecture contract** | `lib/finance/commitment/finance-commitment-architecture-contract.ts` |
| **Tests** | `lib/finance/__tests__/finance-07a-commitment-architecture.test.ts` |
| **Foundation route** | `/dashboard/finance/commitments` |

## Purpose

FIN-07 establishes the financial layer between **planned money** and **actual money**.

Clubs often know about an obligation before an invoice, payment, bank transaction, or accounting entry exists. SCE must represent that **commitment** explicitly and record **who approved it** without exposing bookkeeping workflows to normal club users.

```text
COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD.
SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY.
```

**LOCK:**

```text
COMMITMENT ≠ ACTUAL ≠ PAYMENT ≠ BANK TRANSACTION ≠ ACCOUNTING ENTRY
```

Conceptual chain (not every club uses every step):

```text
Need / Decision → Commitment → Approval → Expected financial effect → Invoice / evidence → Payment → Bank transaction → Accounting
```

FIN-07 remains **independently useful** when downstream steps are absent.

## Domain boundary (FIN-07 is not)

| Out of scope | Owner |
| --- | --- |
| Bank connectivity & reconciliation | SCE-BANK-01 |
| Payment execution & treasury | FIN-09 |
| General ledger & statutory accounting | FIN-11 |
| Receivables / collections | FIN-08 |
| Full accounts-payable module | FIN-07E boundary only (evidence input) |

Core remains **country-agnostic** and **provider-agnostic** (no CHF, Swiss VAT, QR-bill, or bexio assumptions in the domain model).

## Canonical commitment model (FIN-07A persistence foundation)

**Entity:** `FinanceCommitment` — tenant-scoped organisational financial obligation.

| Concern | FIN-07A decision |
| --- | --- |
| Identity | `tenantId`, `financeYearId`, stable `id`, `economicObligationKey` for chain linkage |
| Description | `title`, optional `description`, `externalReference` |
| Value | `amountMinor` (integer), `currency` (tenant-configurable) |
| Classification | Optional `financialAccountId`, optional `costCenterId` (dimensions expand in 07B+) |
| Party | Optional `partyName`, `partyReference` — no hardcoded supplier schema |
| Ownership | Optional `responsibleUserId`, `requestedByUserId` |
| Timing | `commitmentDate`, optional `expectedEvidenceDate`, `expectedPaymentDate` (@db.Date) |
| Governance lifecycle | `lifecycleStatus` — DRAFT → SUBMITTED → ACTIVE → FULFILLED (+ CANCELLED) |
| Approval | Separate `approvalStatus` — NOT_REQUIRED / PENDING / APPROVED / REJECTED |
| Audit | `createdByUserId`, `updatedByUserId`, timestamps; immutable `FinanceCommitmentApprovalDecision` rows |

**Semantics:**

- **APPROVED** does not mean **PAID**.
- **ACTIVE** (committed) does not mean **ACTUAL**.
- **FULFILLED** does not mean **ACCOUNTED**.

## Approval architecture (foundation only)

FIN-07A supports approval **states** and **immutable decision records** without a configurable rules engine.

Future policy dimensions (FIN-07D): amount thresholds, role, cost center, reporting group, commitment type, dimensions, sequential/multi approver, delegation.

| Permission | Key |
| --- | --- |
| View commitments | `finance.commitment.view` (+ `finance.view`) |
| Create / edit | `finance.commitment.manage` |
| Submit | `finance.commitment.submit` |
| Approve / reject | `finance.commitment.approve` (distinct from `finance.approve` for budgets) |
| Manage policy | `finance.commitment.policy.manage` |

## Expected financial events (FIN-04E integration)

**LOCK:**

| Object | Role |
| --- | --- |
| **Commitment** | Business / governance obligation |
| **FinanceExpectedFinancialEvent** | Temporal financial evidence |

FIN-04E **consumes/normalizes timing** — it does **not** duplicate commitment state.

Future integration: `sourceKind = COMMITMENT`, `sourceRefType = FinanceCommitment`, timing via existing precision model (EXACT_DATE, MONTH, DATE_RANGE). **No** annual amount ÷ 12. Timing-only changes do **not** silently mutate Current Forecast.

Enum value `COMMITMENT` is reserved on `FinanceExpectedFinancialEventSourceKind`; sync services arrive in **FIN-07F**.

## Double-counting invariant

**ONE economic obligation must not be counted multiple times merely because it has multiple evidence artifacts.**

`FinanceEconomicEvidenceLink` links artifacts (`COMMITMENT`, `EXPECTED_FINANCIAL_EVENT`, `SUPPLIER_BILL`, `ACTUAL`, `PAYMENT`, `BANK_TRANSACTION`, `ACCOUNTING_ENTRY`) under one `economicObligationKey`.

FIN-07A establishes linkage persistence; aggregation rules and “available = budget − actual − committed” arrive in **FIN-07F** with explicit double-count prevention.

## Supplier bills / payables direction

Supplier bills are **operational inputs** that may create, attach to, or refine commitments — not a full AP module in 07A. See **FIN-07E**.

## Budget & forecast

Commitments must **not** silently overwrite approved budget, current forecast, or actuals. Approved/active commitments may **inform** forecast evidence later (FIN-07F).

## UX / information architecture

Foundation route: `/dashboard/finance/commitments` (minimal read-only foundation panel in 07A).

Main capability nav entry deferred to **FIN-07B**. Future workspace answers: awaiting my decision, already committed, requires attention, financial impact — using **Interpretation → Exception → Explanation → Evidence**, not database field dumps.

## FIN-07 package plan

| Package | Scope |
| --- | --- |
| **07A** | Domain foundation & approval architecture (this document) |
| **07B** | Commitment workspace & core lifecycle |
| **07C** | Approval inbox & decision flow |
| **07D** | Approval policy & thresholds |
| **07E** | Supplier bills / payables evidence |
| **07F** | Budget / forecast commitment intelligence |
| **07G** | Governance, audit & release hardening |

## Migration & deployment

Additive migration: `20261026220000_sce_finance_07a_commitment_foundation`.

Verifier: `scripts/sce-finance-07a-stage-migration-verify.ts` (designated STAGE only).

Preview builds do **not** apply migrations — see [`docs/deployment/stage-preview-migration-runbook.md`](../deployment/stage-preview-migration-runbook.md).

## Roadmap status

| Programme | Status |
| --- | --- |
| FIN-06 | COMPLETE / PO APPROVED |
| FIN-07 | IN PROGRESS |
| FIN-07A | IMPLEMENTED / FOUNDATION REVIEW |
| FIN-07B–07G | NOT STARTED |
