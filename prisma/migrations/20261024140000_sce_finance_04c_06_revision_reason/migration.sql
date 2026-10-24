-- FIN-04C-06: optional structured reforecast reason/context (additive, legacy-safe).

CREATE TYPE "FinanceForecastRevisionReason" AS ENUM (
  'PERIODIC_REVIEW',
  'NEW_ACTUALS',
  'ASSUMPTION_CHANGE',
  'OPERATIONAL_CHANGE',
  'MANAGEMENT_DECISION',
  'CORRECTION',
  'OTHER'
);

ALTER TABLE "FinanceForecastVersion"
  ADD COLUMN "revisionReason" "FinanceForecastRevisionReason",
  ADD COLUMN "revisionContext" TEXT;
