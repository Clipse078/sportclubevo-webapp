import { randomUUID } from "node:crypto";

/**
 * Canonical tenant-scoped economic obligation identity (FIN-07B).
 * Opaque to users — not derived from mutable title/reference text.
 */
export function generateFinanceEconomicObligationKey(tenantId: string): string {
  const tenant = tenantId.trim();
  if (!tenant) {
    throw new Error("tenantId required for economic obligation key");
  }
  return `obl_${tenant}_${randomUUID()}`;
}
