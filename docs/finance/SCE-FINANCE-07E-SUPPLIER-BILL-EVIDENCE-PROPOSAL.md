# SCE-FINANCE-07E — Supplier bill evidence

| Field | Value |
| --- | --- |
| **Date** | 2026-11-13 |
| **Assessment PR** | #969 — architecture, boundaries, deferred scope |
| **Implementation PR** | #971 `cursor/sce-fin-07e-supplier-bill-link-df59` — **external-reference linking only** |
| **Predecessor on STAGE** | FIN-07A–07D implemented |

This document is the **single canonical proposal**. PR #971 must not add a second copy; it carries code plus `docs/finance/SCE-FINANCE-07E-EXTERNAL-REFERENCE-LINKING.md` (implementation note).

---

## DELIVERED — external-reference linking (PR #971, no migration)

| Topic | Scope |
| --- | --- |
| **User action** | Link an **existing external** bill id (invoice no., bexio ref) to a commitment obligation chain |
| **Persistence** | `FinanceEconomicEvidenceLink`: `SUPPLIER_BILL` + `SupplierBillExternalReference` + trimmed `evidenceRefId` |
| **Not included** | File upload, bill title/party/amount metadata rows, rich ingestion, unlink UI |
| **Controls** | `finance.commitment.manage`; tenant isolation; duplicate ref per tenant blocked; audit `EVIDENCE_LINKED`; lifecycle unchanged |

**Distinction:** Linking is **provenance only** — it does not create or store supplier bill records.

---

## PROPOSED (deferred) — bill metadata, attachments, unlink

Status: **PROPOSED** — requires explicit migration approval; **no execution** in assessment sprint.

### Acceptance criteria (future increment)

1. Persisted **supplier bill metadata** (title, party, received date, optional media) beyond a bare external ref string.
2. **Attachments** / file evidence associated with a bill record (not simulated in `evidenceRefId` or commitment fields).
3. **Audit-preserving unlink** (soft unlink or reversing row — no silent delete of link history).
4. Same permission and tenant rules as linking; still no automatic lifecycle transitions from evidence alone.

### Schema (requires authorization)

| Change | Required? |
| --- | --- |
| New model `FinanceSupplierBillEvidence` (tenant, title, externalRef, optional mediaId, partyName, amountMinor, currency, receivedAt) | **YES for persisted bill metadata** |
| New enum values | **NO** |
| `FinanceEconomicEvidenceLink` shape change | **NO** (reuse for chain links) |

**Storage gap on STAGE today:** obligation chain links only; metadata table absent until approved migration.

### Out of scope (programme)

OCR, bexio sync, payment execution, GL posting.

---

## Reused architecture (both increments)

| Capability | Location |
| --- | --- |
| Commitment entity + lifecycle guards | `FinanceCommitment`, `finance-commitment-lifecycle.ts` |
| Evidence chain model | `FinanceEconomicEvidenceLink`, enum `SUPPLIER_BILL` |
| `economicObligationKey` | On `FinanceCommitment` |
| Permissions | `finance.commitment.view` / `manage` / `approve` |
| Tenant isolation | `tenantId` on all finance models |
| Architecture locks | `FINANCE_COMMITMENT_SUPPLIER_BILL_BOUNDARY` |
