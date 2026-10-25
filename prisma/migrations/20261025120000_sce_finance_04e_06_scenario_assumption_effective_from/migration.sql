-- FIN-04E-06: optional effective-from business date on scenario assumptions (additive).
ALTER TABLE "FinanceScenarioAssumption" ADD COLUMN "effectiveFromDate" DATE;
