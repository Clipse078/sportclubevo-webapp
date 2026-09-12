import { decryptBillingBankAccountFields } from "./billing-bank-account-crypto";
import {
  computeBillingBankAccountIbanFingerprint,
  computeBillingBankAccountQrIbanFingerprint,
  normalizeBillingBankAccountIban,
} from "./billing-bank-account-fingerprint";
import {
  findBillingBankAccountWithFingerprintCollision,
  listBillingBankAccountsForLegacyDuplicateScan,
} from "./native-billing-repository";
import { NativeBillingConflictError } from "./native-billing-types";

export const BILLING_BANK_ACCOUNT_DUPLICATE_MESSAGE =
  "Dieses Bankkonto ist für diesen Rechtsträger bereits konfiguriert.";

function identifiersMatch(
  iban: string,
  qrIban: string | null,
  otherIban: string,
  otherQrIban: string | null,
): boolean {
  if (normalizeBillingBankAccountIban(otherIban) === iban) {
    return true;
  }
  if (qrIban && otherQrIban) {
    return normalizeBillingBankAccountIban(otherQrIban) === qrIban;
  }
  return false;
}

export async function assertBillingBankAccountNotDuplicate(input: {
  legalEntityId: string;
  iban: string;
  qrIban: string | null;
  excludeAccountId?: string;
}): Promise<void> {
  const iban = normalizeBillingBankAccountIban(input.iban);
  const qrIban = input.qrIban ? normalizeBillingBankAccountIban(input.qrIban) : null;
  const ibanFingerprint = computeBillingBankAccountIbanFingerprint(iban);
  const qrIbanFingerprint = computeBillingBankAccountQrIbanFingerprint(qrIban);

  const fingerprintCollision = await findBillingBankAccountWithFingerprintCollision({
    legalEntityId: input.legalEntityId,
    ibanFingerprint,
    qrIbanFingerprint,
    excludeAccountId: input.excludeAccountId,
  });
  if (fingerprintCollision) {
    throw new NativeBillingConflictError(BILLING_BANK_ACCOUNT_DUPLICATE_MESSAGE);
  }

  const legacyRows = await listBillingBankAccountsForLegacyDuplicateScan(
    input.legalEntityId,
    input.excludeAccountId,
  );
  for (const row of legacyRows) {
    const decrypted = decryptBillingBankAccountFields({
      ibanEncrypted: row.ibanEncrypted,
      qrIbanEncrypted: row.qrIbanEncrypted,
    });
    if (identifiersMatch(iban, qrIban, decrypted.iban, decrypted.qrIban)) {
      throw new NativeBillingConflictError(BILLING_BANK_ACCOUNT_DUPLICATE_MESSAGE);
    }
  }
}
