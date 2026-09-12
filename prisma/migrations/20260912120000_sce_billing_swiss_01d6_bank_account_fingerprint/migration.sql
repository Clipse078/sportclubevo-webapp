-- Add deterministic IBAN/QR-IBAN fingerprints for duplicate detection (no unique constraint; STAGE may have legacy duplicates).
ALTER TABLE "BillingBankAccount" ADD COLUMN "ibanFingerprint" TEXT;
ALTER TABLE "BillingBankAccount" ADD COLUMN "qrIbanFingerprint" TEXT;

CREATE INDEX "BillingBankAccount_legalEntityId_ibanFingerprint_idx" ON "BillingBankAccount"("legalEntityId", "ibanFingerprint");
