/**
 * FIN-07E — supplier bill evidence via economic obligation chain only (no bill metadata table).
 */

import { FINANCE_COMMITMENT_PERSISTENCE_MODEL } from "@/lib/finance/commitment/finance-commitment-architecture-contract";

/** Persisted evidenceRefType for external bill identifiers (invoice no., bexio id, etc.). */
export const FINANCE_SUPPLIER_BILL_EXTERNAL_REFERENCE_TYPE =
  "SupplierBillExternalReference" as const;

export const FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE = {
  /** Link row only — no file upload or FinanceSupplierBillEvidence metadata in FIN-07E v1. */
  linkExternalReferenceOnly: true,
  evidenceKind: "SUPPLIER_BILL" as const,
  evidenceRefType: FINANCE_SUPPLIER_BILL_EXTERNAL_REFERENCE_TYPE,
  commitmentRefType: FINANCE_COMMITMENT_PERSISTENCE_MODEL.commitment,
  maxExternalReferenceLength: 200,
  unlinkDeferredUntilAuditSoftDelete: true,
} as const;

export function normalizeSupplierBillExternalReference(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("FINANCE_SUPPLIER_BILL_REF_EMPTY");
  }
  if (trimmed.length > FINANCE_SUPPLIER_BILL_EVIDENCE_SCOPE.maxExternalReferenceLength) {
    throw new Error("FINANCE_SUPPLIER_BILL_REF_TOO_LONG");
  }
  return trimmed;
}
