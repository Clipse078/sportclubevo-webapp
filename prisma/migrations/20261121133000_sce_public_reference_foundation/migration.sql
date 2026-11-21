-- SCE public reference foundation (tenant-wide sequence for Strategie, Ziel, Aufgabe, Anliegen).

CREATE TABLE "TenantScePublicNumberSequence" (
    "tenantId" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "TenantScePublicNumberSequence_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "TenantScePublicNumberSequence" ADD CONSTRAINT "TenantScePublicNumberSequence_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubStrategy" ADD COLUMN "scePublicNumber" INTEGER;
ALTER TABLE "Target" ADD COLUMN "scePublicNumber" INTEGER;
ALTER TABLE "Task" ADD COLUMN "scePublicNumber" INTEGER;
ALTER TABLE "ClubMeldung" ADD COLUMN "scePublicNumber" INTEGER;

CREATE UNIQUE INDEX "ClubStrategy_tenantId_scePublicNumber_key" ON "ClubStrategy"("tenantId", "scePublicNumber");
CREATE UNIQUE INDEX "Target_tenantId_scePublicNumber_key" ON "Target"("tenantId", "scePublicNumber");
CREATE UNIQUE INDEX "Task_tenantId_scePublicNumber_key" ON "Task"("tenantId", "scePublicNumber");
CREATE UNIQUE INDEX "ClubMeldung_tenantId_scePublicNumber_key" ON "ClubMeldung"("tenantId", "scePublicNumber");