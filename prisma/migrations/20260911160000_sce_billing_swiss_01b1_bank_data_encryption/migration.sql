-- SCE-BILLING-SWISS-01B1: encrypt IBAN / QR-IBAN at rest (safe when table is empty).

ALTER TABLE "BillingBankAccount" DROP COLUMN "iban";
ALTER TABLE "BillingBankAccount" DROP COLUMN "qrIban";

ALTER TABLE "BillingBankAccount" ADD COLUMN "ibanEncrypted" TEXT NOT NULL;
ALTER TABLE "BillingBankAccount" ADD COLUMN "qrIbanEncrypted" TEXT;
ALTER TABLE "BillingBankAccount" ADD COLUMN "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1;
