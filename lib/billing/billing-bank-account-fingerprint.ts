import { createHmac } from "node:crypto";
import { resolveBillingEncryptionKey } from "./billing-field-crypto";
import { normalizeSwissIban } from "./swiss-qr/swiss-iban";

const IBAN_FINGERPRINT_DOMAIN = "sce-billing-bank-account-iban-v1";
const QR_IBAN_FINGERPRINT_DOMAIN = "sce-billing-bank-account-qriban-v1";

export function normalizeBillingBankAccountIban(value: string): string {
  return normalizeSwissIban(value);
}

function hmacFingerprint(
  domain: string,
  normalizedValue: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  const { key } = resolveBillingEncryptionKey(processEnv);
  return createHmac("sha256", key)
    .update(domain)
    .update("\0")
    .update(normalizedValue, "utf8")
    .digest("base64url");
}

export function computeBillingBankAccountIbanFingerprint(
  normalizedIban: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  return hmacFingerprint(IBAN_FINGERPRINT_DOMAIN, normalizedIban, processEnv);
}

export function computeBillingBankAccountQrIbanFingerprint(
  normalizedQrIban: string | null,
  processEnv: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!normalizedQrIban) {
    return null;
  }
  return hmacFingerprint(QR_IBAN_FINGERPRINT_DOMAIN, normalizedQrIban, processEnv);
}
