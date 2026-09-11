import {
  BillingFieldCryptoError,
  BILLING_FIELD_CRYPTO_VERSION,
  decryptBillingField,
  encryptBillingField,
} from "./billing-field-crypto";

export class BillingBankAccountDecryptionError extends Error {
  readonly name = "BillingBankAccountDecryptionError";

  constructor(message = "Bank account identifier could not be decrypted.") {
    super(message);
  }
}

export type BillingBankAccountEncryptedWrite = {
  ibanEncrypted: string;
  qrIbanEncrypted: string | null;
  encryptionKeyVersion: number;
};

export function encryptBillingBankAccountFields(input: {
  iban: string;
  qrIban: string | null;
}): BillingBankAccountEncryptedWrite {
  return {
    ibanEncrypted: encryptBillingField(input.iban),
    qrIbanEncrypted: input.qrIban ? encryptBillingField(input.qrIban) : null,
    encryptionKeyVersion: BILLING_FIELD_CRYPTO_VERSION,
  };
}

export function decryptBillingBankAccountFields(input: {
  ibanEncrypted: string;
  qrIbanEncrypted: string | null;
}): { iban: string; qrIban: string | null } {
  try {
    return {
      iban: decryptBillingField(input.ibanEncrypted),
      qrIban: input.qrIbanEncrypted ? decryptBillingField(input.qrIbanEncrypted) : null,
    };
  } catch (error) {
    if (error instanceof BillingFieldCryptoError) {
      throw new BillingBankAccountDecryptionError();
    }
    throw error;
  }
}
