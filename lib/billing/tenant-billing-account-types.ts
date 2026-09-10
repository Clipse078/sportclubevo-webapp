import type { BillingDunningStatus } from "@prisma/client";

export type TenantBillingAccountRecord = {
  id: string;
  tenantId: string;
  stripeCustomerId: string;
  linkedAt: Date;
  linkedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  dunningStatus: BillingDunningStatus;
  firstPaymentFailureAt: Date | null;
  latestPaymentFailureAt: Date | null;
  gracePeriodEndsAt: Date | null;
  automaticallySuspendedAt: Date | null;
  resolvedAt: Date | null;
  lastDunningEventAt: Date | null;
  dunningExemptUntil: Date | null;
  dunningExemptNote: string | null;
  automaticDunningEnabled: boolean;
  lastStripeEventId: string | null;
};

export type LinkTenantStripeCustomerInput = {
  tenantId: string;
  stripeCustomerId: string;
  actorUserId: string;
};

export type UnlinkTenantStripeCustomerInput = {
  tenantId: string;
  actorUserId: string;
};

export class BillingTenantNotFoundError extends Error {
  readonly name = "BillingTenantNotFoundError";

  constructor() {
    super("Tenant nicht gefunden.");
  }
}

export class BillingCustomerAlreadyLinkedError extends Error {
  readonly name = "BillingCustomerAlreadyLinkedError";

  constructor() {
    super("Diese Stripe-Kunden-ID ist bereits einem anderen Tenant zugeordnet.");
  }
}

export class BillingAccountNotFoundError extends Error {
  readonly name = "BillingAccountNotFoundError";

  constructor() {
    super("Keine Billing-Verknüpfung für diesen Tenant.");
  }
}

export const BILLING_AUDIT_MODULE = "billing";

export const BILLING_AUDIT_ACTIONS = {
  LINKED: "BILLING_ACCOUNT_LINKED",
  UNLINKED: "BILLING_ACCOUNT_UNLINKED",
  CHANGED: "BILLING_ACCOUNT_CHANGED",
} as const;
