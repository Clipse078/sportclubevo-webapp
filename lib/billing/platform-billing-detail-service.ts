import { subscriptionMonthlyMinorUnits } from "@/lib/billing/billing-kpi";
import { pickPrimarySubscription } from "@/lib/billing/billing-status-presentation";
import { isValidStripeCustomerId } from "@/lib/billing/stripe-customer-id";
import { findBillingAccountByTenantId } from "@/lib/billing/tenant-billing-account-repository";
import type { PlatformBillingStripeState } from "@/lib/billing/platform-billing-overview-service";
import {
  getTenantBillingSummary,
  getTenantInvoiceHistory,
} from "@/lib/integrations/stripe/billing-read-service";
import type {
  BillingInvoiceSummary,
  BillingSubscriptionSummary,
} from "@/lib/integrations/stripe/billing-types";
import { DEFAULT_BILLING_INVOICE_PAGE_SIZE } from "@/lib/integrations/stripe/billing-types";
import { getStripeConfigStatus } from "@/lib/integrations/stripe/config";
import {
  StripeConfigurationError,
  StripeIntegrationError,
  toSafePublicStripeError,
} from "@/lib/integrations/stripe/errors";
import { prisma } from "@/lib/db/prisma";
import type { TenantLifecycleSnapshot } from "@/lib/tenants/tenant-lifecycle-types";
import { getTenantLifecycleSnapshot } from "@/lib/tenants/platform-tenant-lifecycle-service";

export type PlatformBillingTenantInfo = {
  tenantId: string;
  tenantKey: string;
  tenantName: string;
};

export type PlatformBillingDetailInvoice = {
  number: string | null;
  status: string | null;
  invoiceDate: string;
  total: number;
  amountPaid: number;
  amountOpen: number;
  dueDate: string | null;
  currency: string;
  hostedInvoiceUrl: string | null;
};

export type PlatformBillingDetailSubscription = {
  planName: string | null;
  status: string;
  interval: string | null;
  intervalCount: number | null;
  unitAmount: number | null;
  currency: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
};

export type PlatformBillingDetailSummary = {
  planName: string | null;
  subscriptionStatus: string | null;
  monthlyRecurringMinorUnits: number;
  currency: string | null;
  outstandingAmount: number;
  overdueInvoiceCount: number;
  nextBillingDate: string | null;
};

export type PlatformBillingAccountInfo = {
  linkageStatus: "linked" | "invalid";
  linkedAt: string | null;
  currency: string | null;
};

export type PlatformBillingLifecycleInfo = TenantLifecycleSnapshot;

export type PlatformTenantBillingDetail =
  | { kind: "tenant_not_found" }
  | {
      kind: "no_billing_linkage";
      tenant: PlatformBillingTenantInfo;
      lifecycle: PlatformBillingLifecycleInfo;
    }
  | {
      kind: "invalid_linkage";
      tenant: PlatformBillingTenantInfo;
      lifecycle: PlatformBillingLifecycleInfo;
      message: string;
    }
  | {
      kind: "detail";
      tenant: PlatformBillingTenantInfo;
      lifecycle: PlatformBillingLifecycleInfo;
      stripeState: PlatformBillingStripeState;
      billingAccount: PlatformBillingAccountInfo;
      summary: PlatformBillingDetailSummary | null;
      subscription: PlatformBillingDetailSubscription | null;
      invoices: PlatformBillingDetailInvoice[];
      stripeDegraded: boolean;
      degradedMessage: string | null;
      invoicesLoadFailed: boolean;
      summaryLoadFailed: boolean;
    };

function resolveStripeState(): PlatformBillingStripeState {
  const status = getStripeConfigStatus();
  if (!status.allValid) {
    if (!status.hasSecretKey || !status.providerEnabled) {
      return {
        kind: "not_configured",
        message:
          "Stripe ist in dieser Umgebung nicht konfiguriert. Billing-Daten können nicht geladen werden.",
      };
    }
    return {
      kind: "misconfigured",
      message:
        "Die Stripe-Konfiguration ist für diese Umgebung ungültig. Bitte den Secret Key prüfen.",
    };
  }
  return { kind: "ready" };
}

function mapSubscription(
  subscription: BillingSubscriptionSummary | null,
): PlatformBillingDetailSubscription | null {
  if (!subscription) {
    return null;
  }
  return {
    planName: subscription.planName,
    status: subscription.status,
    interval: subscription.interval,
    intervalCount: subscription.intervalCount,
    unitAmount: subscription.unitAmount,
    currency: subscription.currency,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    trialEnd: subscription.trialEnd,
  };
}

function mapInvoice(invoice: BillingInvoiceSummary): PlatformBillingDetailInvoice {
  return {
    number: invoice.number,
    status: invoice.status,
    invoiceDate: invoice.createdAt,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    amountOpen: invoice.amountRemaining,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
  };
}

function pickFullPrimarySubscription(
  subscriptions: BillingSubscriptionSummary[],
): BillingSubscriptionSummary | null {
  const primary = pickPrimarySubscription(subscriptions);
  if (!primary) {
    return null;
  }
  return (
    subscriptions.find(
      (sub) => sub.status === primary.status && sub.planName === primary.planName,
    ) ?? subscriptions[0] ?? null
  );
}

function buildSummaryFromStripe(
  subscriptions: BillingSubscriptionSummary[],
  currency: string | null,
  outstandingAmount: number,
  overdueInvoiceCount: number,
): PlatformBillingDetailSummary {
  const primary = pickFullPrimarySubscription(subscriptions);
  const mrr = subscriptions.reduce(
    (sum, sub) => sum + subscriptionMonthlyMinorUnits(sub),
    0,
  );

  const nextBillingDate =
    primary?.currentPeriodEnd ??
    subscriptions.find((s) => s.currentPeriodEnd)?.currentPeriodEnd ??
    null;

  return {
    planName: primary?.planName ?? null,
    subscriptionStatus: primary?.status ?? null,
    monthlyRecurringMinorUnits: mrr,
    currency,
    outstandingAmount,
    overdueInvoiceCount,
    nextBillingDate,
  };
}

export async function getPlatformTenantBillingDetail(
  tenantId: string,
): Promise<PlatformTenantBillingDetail> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, key: true, name: true },
  });

  if (!tenant) {
    return { kind: "tenant_not_found" };
  }

  const lifecycle = await getTenantLifecycleSnapshot(tenantId);
  if (!lifecycle) {
    return { kind: "tenant_not_found" };
  }

  const tenantInfo: PlatformBillingTenantInfo = {
    tenantId: tenant.id,
    tenantKey: tenant.key,
    tenantName: tenant.name,
  };

  const account = await findBillingAccountByTenantId(tenantId);
  if (!account) {
    return { kind: "no_billing_linkage", tenant: tenantInfo, lifecycle };
  }

  if (!isValidStripeCustomerId(account.stripeCustomerId)) {
    return {
      kind: "invalid_linkage",
      tenant: tenantInfo,
      lifecycle,
      message: "Die gespeicherte Stripe-Verknüpfung ist ungültig.",
    };
  }

  const stripeState = resolveStripeState();
  const billingAccount: PlatformBillingAccountInfo = {
    linkageStatus: "linked",
    linkedAt: account.linkedAt.toISOString(),
    currency: null,
  };

  if (stripeState.kind !== "ready") {
    return {
      kind: "detail",
      tenant: tenantInfo,
      lifecycle,
      stripeState,
      billingAccount,
      summary: null,
      subscription: null,
      invoices: [],
      stripeDegraded: false,
      degradedMessage: null,
      invoicesLoadFailed: false,
      summaryLoadFailed: false,
    };
  }

  let summaryLoadFailed = false;
  let invoicesLoadFailed = false;
  let degradedMessage: string | null = null;

  let summary: PlatformBillingDetailSummary | null = null;
  let subscription: PlatformBillingDetailSubscription | null = null;
  let invoices: PlatformBillingDetailInvoice[] = [];
  let currency = billingAccount.currency;

  try {
    const billingSummary = await getTenantBillingSummary(tenantId);
    currency = billingSummary.currency;
    summary = buildSummaryFromStripe(
      billingSummary.subscriptions,
      billingSummary.currency,
      billingSummary.outstandingAmount,
      billingSummary.overdueOpenInvoiceCount,
    );
    subscription = mapSubscription(
      pickFullPrimarySubscription(billingSummary.subscriptions),
    );
    billingAccount.currency = billingSummary.currency;
  } catch (error) {
    summaryLoadFailed = true;
    if (error instanceof StripeConfigurationError) {
      return {
        kind: "detail",
        tenant: tenantInfo,
        lifecycle,
        stripeState: {
          kind:
            error.code === "STRIPE_NOT_CONFIGURED" ? "not_configured" : "misconfigured",
          message:
            error.code === "STRIPE_NOT_CONFIGURED"
              ? "Stripe ist in dieser Umgebung nicht konfiguriert. Billing-Daten können nicht geladen werden."
              : "Die Stripe-Konfiguration ist für diese Umgebung ungültig. Bitte den Secret Key prüfen.",
        },
        billingAccount,
        summary: null,
        subscription: null,
        invoices: [],
        stripeDegraded: false,
        degradedMessage: null,
        invoicesLoadFailed: false,
        summaryLoadFailed: true,
      };
    }
    if (
      error instanceof StripeIntegrationError &&
      error.code === "NO_BILLING_ACCOUNT"
    ) {
      return { kind: "no_billing_linkage", tenant: tenantInfo, lifecycle };
    }
    degradedMessage =
      "Billing-Daten konnten momentan nicht vollständig geladen werden.";
    toSafePublicStripeError(error);
  }

  try {
    const invoicePage = await getTenantInvoiceHistory({
      tenantId,
      limit: DEFAULT_BILLING_INVOICE_PAGE_SIZE,
    });
    invoices = invoicePage.invoices.map(mapInvoice);
    if (!currency && invoicePage.invoices[0]?.currency) {
      billingAccount.currency = invoicePage.invoices[0].currency;
    }
  } catch (error) {
    invoicesLoadFailed = true;
    if (!degradedMessage) {
      degradedMessage =
        "Billing-Daten konnten momentan nicht vollständig geladen werden.";
    }
    toSafePublicStripeError(error);
  }

  const stripeDegraded = summaryLoadFailed || invoicesLoadFailed;

  return {
    kind: "detail",
    tenant: tenantInfo,
    lifecycle,
    stripeState,
    billingAccount,
    summary,
    subscription,
    invoices,
    stripeDegraded,
    degradedMessage: stripeDegraded ? degradedMessage : null,
    invoicesLoadFailed,
    summaryLoadFailed,
  };
}
