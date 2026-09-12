export const INVOICE_PAYMENT_ERROR_CODES = {
  PAYMENT_EXCEEDS_OUTSTANDING: "PAYMENT_EXCEEDS_OUTSTANDING",
} as const;

export type InvoicePaymentErrorCode =
  (typeof INVOICE_PAYMENT_ERROR_CODES)[keyof typeof INVOICE_PAYMENT_ERROR_CODES];

export const PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE =
  "Der Betrag übersteigt den offenen Rechnungsbetrag.";

export type InvoicePaymentApiErrorBody = {
  error?: string;
  code?: string;
};

export function resolveInvoicePaymentUserMessage(
  body: InvoicePaymentApiErrorBody,
  fallback = "Zahlung konnte nicht verbucht werden.",
): string {
  if (
    body.code === INVOICE_PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_OUTSTANDING
  ) {
    return PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE;
  }
  return body.error?.trim() || fallback;
}
