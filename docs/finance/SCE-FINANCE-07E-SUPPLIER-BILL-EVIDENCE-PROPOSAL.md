# SCE-FINANCE-07E — Supplier bill evidence (review proposal)

| Field | Value |
| --- | --- |
| **Date** | 2026-11-13 |
| **Status** | **PROPOSED** — no migration execution in this sprint |
| **Predecessor on STAGE** | FIN-07A–07D implemented (tests, routes, `FinanceCommitment`, policy) |

## User behavior & acceptance criteria (07E v1)

1. Finance user opens a **commitment** and attaches an existing **supplier bill reference** (upload metadata or external ref — not full AP workflow).
2. User sees bill evidence on the commitment detail with **immutable link** row (who/when).
3. Attaching a bill **does not** change commitment lifecycle automatically; user may refine amount/dates on commitment per architecture contract.
4. User without `finance.commitment.manage` cannot attach; tenant B cannot see tenant A links.
5. Removing a link is **audit-preserving** (soft unlink or new reversing row — no silent delete of history).

**Out of scope v1:** OCR, bexio sync, payment execution, GL posting.

## Existing capabilities reused

| Capability | Location |
| --- | --- |
| Commitment entity + lifecycle guards | `FinanceCommitment`, `finance-commitment-lifecycle.ts` |
| Evidence chain model | `FinanceEconomicEvidenceLink`, enum `SUPPLIER_BILL` |
| `economicObligationKey` | On `FinanceCommitment` |
| Permissions | `finance.commitment.view/manage/approve` |
| Tenant isolation | `tenantId` on all finance models |
| Architecture locks | `FINANCE_COMMITMENT_SUPPLIER_BILL_BOUNDARY` |

**Storage gap:** No dedicated supplier-bill metadata table on STAGE — link rows only until authorized migration.

## Exact schema changes (requires explicit approval)

| Change | Required? |
| --- | --- |
| New model `FinanceSupplierBillEvidence` (tenant, title, externalRef, optional mediaId, partyName, amountMinor, currency, receivedAt) | **YES for persisted bill metadata** |
| New enum values | **NO** |
| `FinanceEconomicEvidenceLink` | **NO** |

## Smallest coherent scope (existing schema — pre-migration)

1. Service: `linkSupplierBillEvidenceToCommitment` → `FinanceEconomicEvidenceLink` (tests with synthetic refs).
2. Read model: list links by `economicObligationKey`.
3. UI gated by `noSupplierBillIngestion` until metadata migration.

