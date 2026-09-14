import type { BillingEmailTransportResult } from "./billing-email-transport";
import { shouldUseBillingDeliveryDryRunTransport } from "./billing-delivery-transport-mode";

export class BillingRealInvoiceDeliveryRejectedError extends Error {
  readonly code:
    | "DELIVERY_DRY_RUN"
    | "DELIVERY_TRANSPORT_NOT_LIVE"
    | "DELIVERY_RECIPIENT_NOT_ACCEPTED";

  constructor(
    code: BillingRealInvoiceDeliveryRejectedError["code"],
    message: string,
  ) {
    super(message);
    this.name = "BillingRealInvoiceDeliveryRejectedError";
    this.code = code;
  }
}

function normalizeEmailAddress(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  return (angleMatch?.[1] ?? trimmed).trim();
}

export function assertRealInvoiceDeliveryTransportPermitted(): void {
  if (shouldUseBillingDeliveryDryRunTransport()) {
    throw new BillingRealInvoiceDeliveryRejectedError(
      "DELIVERY_TRANSPORT_NOT_LIVE",
      "Real invoice delivery is not enabled in this runtime (dry-run transport).",
    );
  }
}

export function assertRealInvoiceDeliveryTransportResult(
  result: BillingEmailTransportResult,
  recipientEmail: string,
): void {
  if (result.provider === "dry-run") {
    throw new BillingRealInvoiceDeliveryRejectedError(
      "DELIVERY_DRY_RUN",
      "Invoice delivery completed in dry-run mode without provider submission.",
    );
  }

  const expected = normalizeEmailAddress(recipientEmail);
  const accepted = result.acceptedRecipients;
  if (accepted && accepted.length > 0) {
    const acceptedNormalized = accepted.map(normalizeEmailAddress);
    if (!acceptedNormalized.includes(expected)) {
      throw new BillingRealInvoiceDeliveryRejectedError(
        "DELIVERY_RECIPIENT_NOT_ACCEPTED",
        "Outbound provider did not accept the invoice recipient.",
      );
    }
  }

  const rejected = result.rejectedRecipients;
  if (rejected && rejected.length > 0) {
    const rejectedNormalized = rejected.map(normalizeEmailAddress);
    if (rejectedNormalized.includes(expected)) {
      throw new BillingRealInvoiceDeliveryRejectedError(
        "DELIVERY_RECIPIENT_NOT_ACCEPTED",
        "Outbound provider rejected the invoice recipient.",
      );
    }
  }
}
