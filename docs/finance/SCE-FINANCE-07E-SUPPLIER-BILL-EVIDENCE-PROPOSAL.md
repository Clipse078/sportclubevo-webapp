# SCE-FINANCE-07E — Supplier bill evidence

| Field | Value |
| --- | --- |
| **Date** | 2026-11-13 |
| **Status** | **SHIPPED (link-only v1)** on branch `cursor/sce-fin-07e-supplier-bill-link-df59` — external reference linking via `FinanceEconomicEvidenceLink`; assessment text remains on `cursor/sce-fin-07-sprint-prep-df59` |
| **Predecessor on STAGE** | FIN-07A–07D |

## Shipped in v1 (no migration)

- `linkSupplierBillExternalReferenceToCommitment` — `evidenceKind=SUPPLIER_BILL`, `evidenceRefType=SupplierBillExternalReference`, `evidenceRefId` = trimmed external ref
- Detail UI section: link + list; explicit copy that this is **not** file upload or bill metadata
- Permissions: `finance.commitment.manage`; tenant isolated; duplicate ref per tenant rejected (`@@unique`)
- Audit: `EVIDENCE_LINKED`; lifecycle unchanged on link
- **Deferred:** unlink (audit-soft-delete), `FinanceSupplierBillEvidence` metadata, file upload

## Still requires migration (future)

| Capability | Blocked without |
| --- | --- |
| Bill title, party, received date, media attachment | `FinanceSupplierBillEvidence` table |
| Rich list labels beyond external ref | Same |
