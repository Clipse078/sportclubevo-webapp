import { findBillingContractById } from "./native-billing-commercial-repository";
import {
  findBillingProfileById,
  listBillingProfilesForCustomer,
} from "./native-billing-repository";
import type { BillingProfileRecord } from "./native-billing-types";

/**
 * Resolves the billing profile used when finalizing a native invoice.
 * Contract linkage takes precedence; otherwise falls back to customer BILLING profile.
 */
export async function resolveInvoiceRecipientProfileForContract(input: {
  billingCustomerId: string;
  billingContractId: string | null;
}): Promise<BillingProfileRecord | null> {
  const contract = input.billingContractId
    ? await findBillingContractById(input.billingContractId)
    : null;
  if (contract?.invoiceRecipientProfileId) {
    const linked = await findBillingProfileById(contract.invoiceRecipientProfileId);
    if (linked) {
      return linked;
    }
  }

  const profiles = await listBillingProfilesForCustomer(input.billingCustomerId);
  return profiles.find((p) => p.profileType === "BILLING") ?? profiles[0] ?? null;
}
