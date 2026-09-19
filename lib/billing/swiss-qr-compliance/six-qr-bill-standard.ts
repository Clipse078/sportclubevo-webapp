/**
 * Authoritative SIX Swiss QR-bill standard version for SportClubEvo billing.
 * Do not infer version from npm dependencies — changes here are deliberate.
 */

export const SIX_IG_QR_BILL_VERSION = "2.3" as const;

export type SixIgQrBillVersion = typeof SIX_IG_QR_BILL_VERSION;

/** Payload header version field (four digits). */
export const SIX_QR_PAYLOAD_VERSION = "0200" as const;

/** UTF-8 coding type per SIX IG 4.2. */
export const SIX_QR_CODING_TYPE = "1" as const;

export const SIX_QR_PAYLOAD_TRAILER = "EPD" as const;

/** SIX IG v2.3 effective with SIC release (structured address mandatory from 22 Nov 2025). */
export const SIX_IG_QR_BILL_2_3_EFFECTIVE_DATE = "2025-11-21";

/** Early layout rules (online / billing information printing) from 2024-01-01 — no payload change. */
export const SIX_IG_QR_BILL_2_3_PARTIAL_EFFECTIVE_DATE = "2024-01-01";

/** SIX IG v2.4 published; CHF has no technical payload change; EUR reference rules tighten. */
export const SIX_IG_QR_BILL_2_4_EFFECTIVE_DATE = "2026-11-14";

export const SIX_QR_BILL_OFFICIAL_SOURCES = {
  igQrBill23Pdf:
    "https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-en.pdf",
  igQrBill24Pdf:
    "https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.4-en.pdf",
  igQrBillDelta23Pdf:
    "https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-delta-guide-v2.3-en.pdf",
  qrBillStandardsPage:
    "https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html",
  paymentStandardization:
    "https://www.six-group.com/en/products-services/banking-services/payment-standardization.html",
} as const;

/** Currencies permitted by SIX IG v2.3 QR payload. */
export const SIX_QR_PERMITTED_CURRENCIES = ["CHF", "EUR"] as const;

/** Currencies SportClubEvo product supports for Swiss QR invoices today. */
export const SCE_SWISS_QR_PRODUCT_CURRENCIES = ["CHF"] as const;

export const SIX_QR_FIELD_LIMITS = {
  name: 70,
  street: 70,
  buildingNumber: 16,
  postalCode: 16,
  city: 35,
  countryCode: 2,
  unstructuredMessage: 140,
  billingInformation: 140,
  combinedAdditionalInformation: 140,
  maxPayloadCharacters: 997,
  amountMaxMajor: 999_999_999.99,
  amountMinMajor: 0.01,
} as const;
