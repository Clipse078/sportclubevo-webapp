/** Platform-wide BCC for every real customer invoice email (not visible to the customer). */
export const PLATFORM_INVOICE_EMAIL_BCC = "hello@tulip-digital.ch";

export type BillingEmailDeliveryIntent = "normal" | "protected-test";

export function resolvePlatformInvoiceEmailBcc(
  deliveryIntent: BillingEmailDeliveryIntent,
): string | undefined {
  if (deliveryIntent === "protected-test") {
    return undefined;
  }
  return PLATFORM_INVOICE_EMAIL_BCC;
}
