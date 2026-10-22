-- SCE-FINANCE-01E-R3 — snapshot organisation base currency on approved budget versions.

ALTER TABLE "FinanceBudgetVersion" ADD COLUMN "baseCurrency" TEXT;
