-- SCE-BILLING-SWISS-01H — camt.054 reconciliation idempotency on bank transaction id.

CREATE UNIQUE INDEX "InvoicePayment_bankTransactionId_key"
ON "InvoicePayment"("bankTransactionId")
WHERE "bankTransactionId" IS NOT NULL;
