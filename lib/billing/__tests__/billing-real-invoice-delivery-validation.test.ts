import { describe, expect, it } from "vitest";
import {
  assertRealInvoiceDeliveryTransportResult,
  BillingRealInvoiceDeliveryRejectedError,
} from "../invoice-delivery/billing-real-invoice-delivery-validation";

describe("billing real invoice delivery validation", () => {
  it("rejects dry-run provider results", () => {
    expect(() =>
      assertRealInvoiceDeliveryTransportResult(
        {
          provider: "dry-run",
          messageId: "dry-run-1",
          from: "dry-run@test",
        },
        "customer@example.com",
      ),
    ).toThrow(BillingRealInvoiceDeliveryRejectedError);
  });

  it("accepts provider result when recipient is listed as accepted", () => {
    expect(() =>
      assertRealInvoiceDeliveryTransportResult(
        {
          provider: "infomaniak-smtp",
          messageId: "<1>",
          from: "billing@test",
          acceptedRecipients: ["customer@example.com"],
          rejectedRecipients: [],
        },
        "customer@example.com",
      ),
    ).not.toThrow();
  });
});
