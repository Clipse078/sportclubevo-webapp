import { prisma } from "@/lib/db/prisma";
import {
  getTenantBillingAccount,
  resolveTenantIdFromKey,
} from "@/lib/billing/tenant-billing-account-service";
import type Stripe from "stripe";
import {
  mapStripeInvoice,
  mapStripeSubscription,
  pickPrimaryCurrency,
  sumOutstandingFromInvoices,
} from "./billing-mappers";
import {
  DEFAULT_BILLING_INVOICE_PAGE_SIZE,
  type BillingInvoiceListPage,
  type BillingInvoiceSummary,
  type BillingSubscriptionSummary,
  type TenantBillingSummary,
} from "./billing-types";
import { getStripeClient } from "./client";
import {
  mapStripeSdkError,
  StripeIntegrationError,
} from "./errors";

const OPEN_INVOICE_SCAN_LIMIT = 100;

export type TenantBillingContext = {
  tenantId: string;
  tenantKey: string;
  tenantName: string;
  stripeCustomerId: string;
};

async function loadTenantBillingContext(
  tenantId: string,
): Promise<TenantBillingContext | null> {
  const account = await getTenantBillingAccount(tenantId);
  if (!account) {
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, key: true, name: true },
  });

  if (!tenant) {
    return null;
  }

  return {
    tenantId: tenant.id,
    tenantKey: tenant.key,
    tenantName: tenant.name,
    stripeCustomerId: account.stripeCustomerId,
  };
}

function resolveStripe(deps?: { stripe?: Stripe }): Stripe {
  return deps?.stripe ?? getStripeClient();
}

async function listSubscriptionsForCustomer(
  stripe: Stripe,
  stripeCustomerId: string,
): Promise<BillingSubscriptionSummary[]> {
  const response = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 20,
    status: "all",
    expand: ["data.items.data.price.product"],
  });

  return response.data.map(mapStripeSubscription);
}

async function listInvoiceSummariesForCustomer(
  stripe: Stripe,
  stripeCustomerId: string,
  options: { limit: number; startingAfter?: string; status?: Stripe.InvoiceListParams["status"] },
): Promise<{ invoices: BillingInvoiceSummary[]; hasMore: boolean; nextCursor: string | null }> {
  const response = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: options.limit,
    starting_after: options.startingAfter,
    status: options.status,
  });

  const invoices = response.data.map(mapStripeInvoice);
  const lastId = invoices.at(-1)?.stripeInvoiceId ?? null;

  return {
    invoices,
    hasMore: response.has_more,
    nextCursor: response.has_more && lastId ? lastId : null,
  };
}

export async function getTenantBillingSummary(
  tenantId: string,
  deps?: { stripe?: Stripe },
): Promise<TenantBillingSummary> {
  const context = await loadTenantBillingContext(tenantId);
  if (!context) {
    throw new StripeIntegrationError(
      "NO_BILLING_ACCOUNT",
      "No billing account is linked for this tenant.",
    );
  }

  const stripe = resolveStripe(deps);

  try {
    const subscriptions = await listSubscriptionsForCustomer(
      stripe,
      context.stripeCustomerId,
    );

    const latestPage = await listInvoiceSummariesForCustomer(
      stripe,
      context.stripeCustomerId,
      { limit: 1 },
    );

    const openInvoicesPage = await listInvoiceSummariesForCustomer(
      stripe,
      context.stripeCustomerId,
      { limit: OPEN_INVOICE_SCAN_LIMIT, status: "open" },
    );

    const outstandingInvoices = openInvoicesPage.invoices;

    return {
      tenantId: context.tenantId,
      tenantKey: context.tenantKey,
      tenantName: context.tenantName,
      stripeCustomerId: context.stripeCustomerId,
      subscriptions,
      latestInvoice: latestPage.invoices[0] ?? null,
      outstandingAmount: sumOutstandingFromInvoices(outstandingInvoices),
      currency: pickPrimaryCurrency(
        [...latestPage.invoices, ...outstandingInvoices],
        subscriptions,
      ),
    };
  } catch (error) {
    throw mapStripeSdkError(error);
  }
}

export async function getTenantSubscriptions(
  tenantId: string,
  deps?: { stripe?: Stripe },
): Promise<BillingSubscriptionSummary[]> {
  const context = await loadTenantBillingContext(tenantId);
  if (!context) {
    throw new StripeIntegrationError(
      "NO_BILLING_ACCOUNT",
      "No billing account is linked for this tenant.",
    );
  }

  try {
    return await listSubscriptionsForCustomer(
      resolveStripe(deps),
      context.stripeCustomerId,
    );
  } catch (error) {
    throw mapStripeSdkError(error);
  }
}

export async function getTenantInvoices(input: {
  tenantId: string;
  limit?: number;
  startingAfter?: string;
  stripe?: Stripe;
}): Promise<BillingInvoiceListPage> {
  const context = await loadTenantBillingContext(input.tenantId);
  if (!context) {
    throw new StripeIntegrationError(
      "NO_BILLING_ACCOUNT",
      "No billing account is linked for this tenant.",
    );
  }

  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_BILLING_INVOICE_PAGE_SIZE, 1),
    100,
  );

  try {
    return await listInvoiceSummariesForCustomer(
      resolveStripe({ stripe: input.stripe }),
      context.stripeCustomerId,
      {
        limit,
        startingAfter: input.startingAfter,
      },
    );
  } catch (error) {
    throw mapStripeSdkError(error);
  }
}

export async function getStripeInvoiceForTenant(input: {
  tenantId: string;
  stripeInvoiceId: string;
  stripe?: Stripe;
}): Promise<BillingInvoiceSummary> {
  const context = await loadTenantBillingContext(input.tenantId);
  if (!context) {
    throw new StripeIntegrationError(
      "NO_BILLING_ACCOUNT",
      "No billing account is linked for this tenant.",
    );
  }

  const stripe = resolveStripe({ stripe: input.stripe });

  try {
    const invoice = await stripe.invoices.retrieve(input.stripeInvoiceId);

    const invoiceCustomerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (invoiceCustomerId !== context.stripeCustomerId) {
      throw new StripeIntegrationError(
        "INVOICE_NOT_OWNED_BY_TENANT",
        "Invoice does not belong to the linked Stripe customer for this tenant.",
      );
    }

    return mapStripeInvoice(invoice);
  } catch (error) {
    if (error instanceof StripeIntegrationError) {
      throw error;
    }
    throw mapStripeSdkError(error);
  }
}

export async function resolveTenantIdFromTenantKey(
  tenantKey: string,
): Promise<string | null> {
  return resolveTenantIdFromKey(tenantKey.trim());
}
