import { logAction } from "@/lib/audit/log-action";
import { assertValidStripeCustomerId } from "./stripe-customer-id";
import {
  BILLING_AUDIT_ACTIONS,
  BILLING_AUDIT_MODULE,
  BillingCustomerAlreadyLinkedError,
  BillingTenantNotFoundError,
  type LinkTenantStripeCustomerInput,
  type TenantBillingAccountRecord,
  type UnlinkTenantStripeCustomerInput,
} from "./tenant-billing-account-types";
import {
  createBillingAccount,
  deleteBillingAccountByTenantId,
  findBillingAccountByStripeCustomerId,
  findBillingAccountByTenantId,
  findTenantIdByKey,
  tenantExistsById,
  updateBillingAccountStripeCustomerId,
} from "./tenant-billing-account-repository";

export { BillingValidationError } from "./stripe-customer-id";
export {
  BillingAccountNotFoundError,
  BillingCustomerAlreadyLinkedError,
  BillingTenantNotFoundError,
} from "./tenant-billing-account-types";

export async function getTenantBillingAccount(
  tenantId: string,
): Promise<TenantBillingAccountRecord | null> {
  return findBillingAccountByTenantId(tenantId);
}

export async function linkTenantStripeCustomer(
  input: LinkTenantStripeCustomerInput,
): Promise<TenantBillingAccountRecord> {
  const stripeCustomerId = assertValidStripeCustomerId(input.stripeCustomerId);

  if (!(await tenantExistsById(input.tenantId))) {
    throw new BillingTenantNotFoundError();
  }

  const existingForCustomer = await findBillingAccountByStripeCustomerId(stripeCustomerId);
  if (existingForCustomer && existingForCustomer.tenantId !== input.tenantId) {
    throw new BillingCustomerAlreadyLinkedError();
  }

  const existingForTenant = await findBillingAccountByTenantId(input.tenantId);

  if (existingForTenant) {
    if (existingForTenant.stripeCustomerId === stripeCustomerId) {
      return existingForTenant;
    }

    const updated = await updateBillingAccountStripeCustomerId({
      tenantId: input.tenantId,
      stripeCustomerId,
      linkedByUserId: input.actorUserId,
    });

    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: BILLING_AUDIT_MODULE,
      entityType: "TenantBillingAccount",
      entityId: updated.id,
      action: BILLING_AUDIT_ACTIONS.CHANGED,
      tenantId: input.tenantId,
      beforeJson: { stripeCustomerId: existingForTenant.stripeCustomerId },
      afterJson: { stripeCustomerId: updated.stripeCustomerId },
      metadataJson: { tenantId: input.tenantId },
    });

    return updated;
  }

  const created = await createBillingAccount({
    tenantId: input.tenantId,
    stripeCustomerId,
    linkedByUserId: input.actorUserId,
  });

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: BILLING_AUDIT_MODULE,
    entityType: "TenantBillingAccount",
    entityId: created.id,
    action: BILLING_AUDIT_ACTIONS.LINKED,
    tenantId: input.tenantId,
    afterJson: { stripeCustomerId: created.stripeCustomerId },
    metadataJson: { tenantId: input.tenantId },
  });

  return created;
}

export async function unlinkTenantStripeCustomer(
  input: UnlinkTenantStripeCustomerInput,
): Promise<void> {
  if (!(await tenantExistsById(input.tenantId))) {
    throw new BillingTenantNotFoundError();
  }

  const removed = await deleteBillingAccountByTenantId(input.tenantId);
  if (!removed) {
    return;
  }

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: BILLING_AUDIT_MODULE,
    entityType: "TenantBillingAccount",
    entityId: removed.id,
    action: BILLING_AUDIT_ACTIONS.UNLINKED,
    tenantId: input.tenantId,
    beforeJson: { stripeCustomerId: removed.stripeCustomerId },
    metadataJson: { tenantId: input.tenantId },
  });
}

export async function resolveTenantIdFromKey(tenantKey: string): Promise<string | null> {
  return findTenantIdByKey(tenantKey);
}
