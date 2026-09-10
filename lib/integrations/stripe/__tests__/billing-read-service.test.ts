import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const TENANT_ID = "tenant-1";
const TENANT_KEY = "fc-demo";
const CUS_A = "cus_LinkedCustomer001";
const CUS_OTHER = "cus_OtherCustomer999";

const mocks = vi.hoisted(() => ({
  getTenantBillingAccount: vi.fn(),
  tenantFindUnique: vi.fn(),
}));

vi.mock("@/lib/billing/tenant-billing-account-service", () => ({
  getTenantBillingAccount: mocks.getTenantBillingAccount,
  resolveTenantIdFromKey: vi.fn(async (key: string) =>
    key === TENANT_KEY ? TENANT_ID : null,
  ),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
  },
}));

import {
  getStripeInvoiceForTenant,
  getTenantBillingSummary,
  getTenantInvoiceHistory,
  getTenantInvoices,
  getTenantSubscriptions,
} from "../billing-read-service";
import { StripeIntegrationError } from "../errors";

function billingAccount() {
  return {
    id: "acc-1",
    tenantId: TENANT_ID,
    stripeCustomerId: CUS_A,
    linkedAt: new Date("2025-01-01T00:00:00.000Z"),
    linkedByUserId: "user-1",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  };
}

function tenantRow() {
  return { id: TENANT_ID, key: TENANT_KEY, name: "Demo Club" };
}

function makeStripeMock(handlers: {
  subscriptions?: Stripe.Subscription[];
  invoices?: Stripe.Invoice[];
  invoicePages?: Stripe.Invoice[][];
  retrieveInvoice?: Stripe.Invoice;
  listError?: unknown;
  retrieveError?: unknown;
}): Stripe {
  let invoiceCall = 0;

  return {
    subscriptions: {
      list: vi.fn(async () => ({
        data: handlers.subscriptions ?? [],
        has_more: false,
      })),
    },
    invoices: {
      list: vi.fn(async () => {
        if (handlers.listError) {
          throw handlers.listError;
        }
        if (handlers.invoicePages) {
          const page = handlers.invoicePages[invoiceCall] ?? [];
          invoiceCall += 1;
          const hasMore = invoiceCall < handlers.invoicePages.length;
          return { data: page, has_more: hasMore };
        }
        return {
          data: handlers.invoices ?? [],
          has_more: false,
        };
      }),
      retrieve: vi.fn(async () => {
        if (handlers.retrieveError) {
          throw handlers.retrieveError;
        }
        if (!handlers.retrieveInvoice) {
          throw { type: "StripeInvalidRequestError", statusCode: 404 };
        }
        return handlers.retrieveInvoice;
      }),
    },
  } as unknown as Stripe;
}

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    object: "subscription",
    status: "active",
    cancel_at_period_end: false,
    items: {
      object: "list",
      data: [
        {
          id: "si_1",
          object: "subscription_item",
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
          price: {
            id: "price_1",
            object: "price",
            unit_amount: 9900,
            currency: "chf",
            recurring: { interval: "month", interval_count: 1 },
            product: {
              id: "prod_1",
              object: "product",
              name: "Club Plan",
            },
          },
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
    ...overrides,
  } as Stripe.Subscription;
}

function invoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_1",
    object: "invoice",
    customer: CUS_A,
    number: "INV-001",
    status: "open",
    subtotal: 10000,
    total: 10770,
    total_taxes: [{ amount: 770 }],
    amount_due: 10770,
    amount_paid: 0,
    amount_remaining: 10770,
    currency: "chf",
    created: 1_700_000_000,
    due_date: 1_700_086_400,
    status_transitions: { paid_at: null },
    hosted_invoice_url: "https://invoice.stripe.com/i/test",
    invoice_pdf: "https://pay.stripe.com/invoice/test/pdf",
    ...overrides,
  } as Stripe.Invoice;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTenantBillingAccount.mockResolvedValue(billingAccount());
  mocks.tenantFindUnique.mockResolvedValue(tenantRow());
});

describe("tenant billing read service", () => {
  it("returns NO_BILLING_ACCOUNT when linkage is missing", async () => {
    mocks.getTenantBillingAccount.mockResolvedValue(null);

    await expect(getTenantBillingSummary(TENANT_ID)).rejects.toMatchObject({
      code: "NO_BILLING_ACCOUNT",
    });
  });

  it("loads active subscriptions for linked customer only", async () => {
    const stripe = makeStripeMock({ subscriptions: [subscription()] });

    const subs = await getTenantSubscriptions(TENANT_ID, { stripe });

    expect(stripe.subscriptions.list).toHaveBeenCalledWith(
      expect.objectContaining({ customer: CUS_A }),
    );
    expect(subs).toHaveLength(1);
    expect(subs[0]?.planName).toBe("Club Plan");
  });

  it("handles no subscriptions", async () => {
    const stripe = makeStripeMock({ subscriptions: [], invoices: [] });

    const summary = await getTenantBillingSummary(TENANT_ID, { stripe });
    expect(summary.subscriptions).toEqual([]);
    expect(summary.latestInvoice).toBeNull();
    expect(summary.outstandingAmount).toBe(0);
  });

  it("computes outstanding amount from open invoices", async () => {
    const open = invoice({ id: "in_open", amount_remaining: 5000, status: "open" });
    const paid = invoice({
      id: "in_paid",
      status: "paid",
      amount_remaining: 0,
      amount_paid: 10000,
    });

    const stripe = makeStripeMock({
      subscriptions: [],
      invoicePages: [[paid], [open]],
    });

    const summary = await getTenantBillingSummary(TENANT_ID, { stripe });
    expect(summary.outstandingAmount).toBe(5000);
    expect(summary.latestInvoice?.stripeInvoiceId).toBe("in_paid");
  });

  it("counts overdue open invoices from the open-invoice scan", async () => {
    const overdue = invoice({
      id: "in_overdue",
      status: "open",
      amount_remaining: 2500,
      due_date: Math.floor(Date.now() / 1000) - 86400,
    });
    const future = invoice({
      id: "in_future",
      status: "open",
      amount_remaining: 1000,
      due_date: Math.floor(Date.now() / 1000) + 86400 * 30,
    });

    const stripe = makeStripeMock({
      subscriptions: [],
      invoicePages: [[future], [overdue]],
    });

    const summary = await getTenantBillingSummary(TENANT_ID, { stripe });
    expect(summary.overdueOpenInvoiceCount).toBe(1);
  });

  it("maps tax on invoices", async () => {
    const stripe = makeStripeMock({
      subscriptions: [],
      invoices: [invoice({ total_taxes: [{ amount: 770 }] })],
    });

    const page = await getTenantInvoices({ tenantId: TENANT_ID, stripe });
    expect(page.invoices[0]?.tax).toBe(770);
  });

  it("supports invoice cursor pagination", async () => {
    const stripe = makeStripeMock({
      invoices: [invoice({ id: "in_a" }), invoice({ id: "in_b" })],
    });
    (stripe.invoices.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [invoice({ id: "in_a" })],
      has_more: true,
    });

    const page = await getTenantInvoices({
      tenantId: TENANT_ID,
      limit: 1,
      stripe,
    });

    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("in_a");
  });

  it("rejects invoice owned by a different Stripe customer", async () => {
    const stripe = makeStripeMock({
      retrieveInvoice: invoice({ id: "in_other", customer: CUS_OTHER }),
    });

    await expect(
      getStripeInvoiceForTenant({
        tenantId: TENANT_ID,
        stripeInvoiceId: "in_other",
        stripe,
      }),
    ).rejects.toMatchObject({ code: "INVOICE_NOT_OWNED_BY_TENANT" });
  });

  it("returns invoice detail for linked customer", async () => {
    const stripe = makeStripeMock({
      retrieveInvoice: invoice({ id: "in_owned" }),
    });

    const detail = await getStripeInvoiceForTenant({
      tenantId: TENANT_ID,
      stripeInvoiceId: "in_owned",
      stripe,
    });

    expect(detail.stripeInvoiceId).toBe("in_owned");
    expect(detail.hostedInvoiceUrl).toContain("stripe.com");
  });

  it("maps Stripe auth failures", async () => {
    const stripe = makeStripeMock({
      listError: { type: "StripeAuthenticationError", statusCode: 401 },
    });

    await expect(getTenantInvoices({ tenantId: TENANT_ID, stripe })).rejects.toMatchObject({
      code: "STRIPE_AUTHENTICATION_FAILED",
    });
  });

  it("maps Stripe unavailable errors", async () => {
    const stripe = makeStripeMock({ subscriptions: [] });
    (stripe.subscriptions.list as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      type: "StripeConnectionError",
    });

    await expect(getTenantSubscriptions(TENANT_ID, { stripe })).rejects.toMatchObject({
      code: "STRIPE_UNAVAILABLE",
    });
  });

  it("returns invoice history newest-first with default limit", async () => {
    const stripe = makeStripeMock({
      invoices: [
        invoice({
          id: "in_old",
          created: 1_600_000_000,
          number: "OLD",
        }),
        invoice({
          id: "in_new",
          created: 1_700_000_000,
          number: "NEW",
        }),
      ],
    });

    const page = await getTenantInvoiceHistory({ tenantId: TENANT_ID, stripe });
    expect(page.invoices[0]?.number).toBe("NEW");
    expect(page.invoices[1]?.number).toBe("OLD");
  });

  it("never accepts caller-supplied customer id (queries linked cus_* only)", async () => {
    const stripe = makeStripeMock({ subscriptions: [] });
    await getTenantSubscriptions(TENANT_ID, { stripe });

    const listArgs = (stripe.subscriptions.list as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(listArgs.customer).toBe(CUS_A);
    expect(listArgs.customer).not.toBe(CUS_OTHER);
  });
});

describe("StripeIntegrationError", () => {
  it("exposes stable codes", () => {
    expect(new StripeIntegrationError("NO_BILLING_ACCOUNT", "x").code).toBe(
      "NO_BILLING_ACCOUNT",
    );
  });
});
