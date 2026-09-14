import { prisma } from "@/lib/db/prisma";
import { findActiveBillingCustomerTenantLink } from "@/lib/billing/native-billing-repository";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";

/**
 * Resolves the single active tenant for a billing customer (commercial outbound).
 * Multiple active links are treated as ambiguous and fail closed.
 */
export async function resolveTenantIdForBillingCustomer(
  billingCustomerId: string,
): Promise<string> {
  const links = await prisma.billingCustomerTenant.findMany({
    where: { billingCustomerId, activeUntil: null },
    orderBy: { createdAt: "asc" },
    select: { tenantId: true },
    take: 2,
  });

  if (links.length === 0) {
    throw new NativeBillingValidationError(
      "Kein aktiver Mandant ist mit diesem Rechnungskunden verknüpft.",
    );
  }
  if (links.length > 1) {
    throw new NativeBillingValidationError(
      "Mehrere aktive Mandantenverknüpfungen — die Kommunikation kann nicht eindeutig zugeordnet werden.",
    );
  }
  return links[0].tenantId;
}

export async function assertTenantMatchesBillingCustomer(
  tenantId: string,
  billingCustomerId: string,
): Promise<void> {
  const link = await findActiveBillingCustomerTenantLink(billingCustomerId, tenantId);
  if (!link || link.activeUntil !== null) {
    throw new NativeBillingValidationError(
      "Der Mandant ist nicht mit diesem Rechnungskunden verknüpft.",
    );
  }
}
