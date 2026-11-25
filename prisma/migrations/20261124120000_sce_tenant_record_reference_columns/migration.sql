-- Tenant-wide public reference columns for Strategie, Ziel, and Anliegen (shared sequence + ledger from #1028).

ALTER TABLE "ClubStrategy" ADD COLUMN "tenantPublicNumber" BIGINT;
ALTER TABLE "Target" ADD COLUMN "tenantPublicNumber" BIGINT;
ALTER TABLE "ClubMeldung" ADD COLUMN "tenantPublicNumber" BIGINT;

CREATE UNIQUE INDEX "ClubStrategy_tenantId_tenantPublicNumber_key" ON "ClubStrategy"("tenantId", "tenantPublicNumber");
CREATE UNIQUE INDEX "Target_tenantId_tenantPublicNumber_key" ON "Target"("tenantId", "tenantPublicNumber");
CREATE UNIQUE INDEX "ClubMeldung_tenantId_tenantPublicNumber_key" ON "ClubMeldung"("tenantId", "tenantPublicNumber");