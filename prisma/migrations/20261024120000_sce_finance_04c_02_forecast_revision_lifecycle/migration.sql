-- SCE-FIN-04C-02 — rolling forecast revision metadata (additive, legacy-safe).

CREATE TYPE "FinanceForecastRevisionSource" AS ENUM (
  'INITIAL_FORECAST',
  'MANUAL_REFORECAST',
  'AUTOMATIC_FORECAST_ADOPTION'
);

ALTER TABLE "FinanceForecastVersion"
  ADD COLUMN "asOfDate" DATE,
  ADD COLUMN "actualsThroughDate" DATE,
  ADD COLUMN "revisionSource" "FinanceForecastRevisionSource",
  ADD COLUMN "revisionLabel" TEXT,
  ADD COLUMN "previousVersionId" TEXT,
  ADD COLUMN "sourceProjectionVersionId" TEXT;

CREATE INDEX "FinanceForecastVersion_previousVersionId_idx"
  ON "FinanceForecastVersion"("previousVersionId");

CREATE INDEX "FinanceForecastVersion_sourceProjectionVersionId_idx"
  ON "FinanceForecastVersion"("sourceProjectionVersionId");

ALTER TABLE "FinanceForecastVersion"
  ADD CONSTRAINT "FinanceForecastVersion_previousVersionId_fkey"
  FOREIGN KEY ("previousVersionId") REFERENCES "FinanceForecastVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceForecastVersion"
  ADD CONSTRAINT "FinanceForecastVersion_sourceProjectionVersionId_fkey"
  FOREIGN KEY ("sourceProjectionVersionId") REFERENCES "FinanceProjectionVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
