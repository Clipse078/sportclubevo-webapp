import { InvoiceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { pickLatestCustomerLastInvoice } from "../billing-customer-last-invoice";

describe("pickLatestCustomerLastInvoice", () => {
  const customerId = "cust-1";

  it("skips VOID invoices even when they have a later invoice date", () => {
    const map = pickLatestCustomerLastInvoice([
      {
        billingCustomerId: customerId,
        invoiceNumber: "2026-000001",
        status: InvoiceStatus.VOID,
        invoiceDate: new Date("2026-09-12"),
        createdAt: new Date("2026-09-12T10:00:00Z"),
      },
      {
        billingCustomerId: customerId,
        invoiceNumber: "2026-000002",
        status: InvoiceStatus.FINALIZED,
        invoiceDate: new Date("2026-09-01"),
        createdAt: new Date("2026-09-01T10:00:00Z"),
      },
    ]);

    expect(map.get(customerId)).toEqual({
      label: "2026-000002",
      date: "2026-09-01",
    });
  });

  it("picks the newest non-void invoice by invoice date", () => {
    const map = pickLatestCustomerLastInvoice([
      {
        billingCustomerId: customerId,
        invoiceNumber: "2026-000001",
        status: InvoiceStatus.PAID,
        invoiceDate: new Date("2026-08-01"),
        createdAt: new Date("2026-08-01T10:00:00Z"),
      },
      {
        billingCustomerId: customerId,
        invoiceNumber: "2026-000003",
        status: InvoiceStatus.FINALIZED,
        invoiceDate: new Date("2026-09-15"),
        createdAt: new Date("2026-09-15T10:00:00Z"),
      },
    ]);

    expect(map.get(customerId)?.label).toBe("2026-000003");
  });
});
