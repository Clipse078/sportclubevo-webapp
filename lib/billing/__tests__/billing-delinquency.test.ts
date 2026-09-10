import { describe, expect, it } from "vitest";
import {
  hasBlockingBillingDelinquencyFromParts,
  isInvoiceBlockingDelinquent,
  isTenantBillingDelinquencyResolved,
} from "../billing-delinquency";
import type { BillingInvoiceSummary } from "@/lib/integrations/stripe/billing-types";

function invoice(overrides: Partial<BillingInvoiceSummary> = {}): BillingInvoiceSummary {
  return {
    stripeInvoiceId: "in_1",
    number: "1",
    status: "open",
    subtotal: 1000,
    tax: 0,
    total: 1000,
    amountDue: 1000,
    amountPaid: 0,
    amountRemaining: 1000,
    currency: "chf",
    createdAt: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-01-01T00:00:00.000Z",
    paidAt: null,
    hostedInvoiceUrl: null,
    invoicePdfUrl: null,
    ...overrides,
  };
}

describe("billing-delinquency", () => {
  it("treats open auto-charge invoices without due date as blocking", () => {
    expect(
      isInvoiceBlockingDelinquent(invoice({ dueDate: null }), Date.parse("2026-06-01")),
    ).toBe(true);
  });

  it("does not treat future-dated open invoices as blocking", () => {
    expect(
      isInvoiceBlockingDelinquent(
        invoice({ dueDate: "2026-12-01T00:00:00.000Z" }),
        Date.parse("2026-06-01"),
      ),
    ).toBe(false);
  });

  it("requires all blocking invoices cleared for resolution", () => {
    const summary = {
      tenantId: "t1",
      tenantKey: "a",
      tenantName: "A",
      stripeCustomerId: "cus_1",
      subscriptions: [{ stripeSubscriptionId: "sub", status: "active" } as never],
      latestInvoice: null,
      outstandingAmount: 1000,
      overdueOpenInvoiceCount: 0,
      currency: "chf",
    };
    const open = [
      invoice({ stripeInvoiceId: "in_paid", amountRemaining: 0 }),
      invoice({ stripeInvoiceId: "in_open", amountRemaining: 500, dueDate: null }),
    ];
    expect(isTenantBillingDelinquencyResolved(summary, open)).toBe(false);
    expect(
      isTenantBillingDelinquencyResolved(
        summary,
        [invoice({ amountRemaining: 0, status: "paid" })],
      ),
    ).toBe(true);
  });

  it("detects past_due subscription as delinquent", () => {
    expect(
      hasBlockingBillingDelinquencyFromParts({
        subscriptions: [{ status: "past_due" } as never],
        openInvoices: [],
      }),
    ).toBe(true);
  });
});
