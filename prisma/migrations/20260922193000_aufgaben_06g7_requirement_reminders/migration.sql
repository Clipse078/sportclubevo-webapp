-- AUFGABEN-06G7 — Requirement explicit reminder schedule (canonical task reminder semantics)
ALTER TABLE "Requirement"
ADD COLUMN "reminder1At" TIMESTAMP(3),
ADD COLUMN "reminder2At" TIMESTAMP(3),
ADD COLUMN "reminder1PresetKey" TEXT,
ADD COLUMN "reminder2PresetKey" TEXT,
ADD COLUMN "remindersConfigured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Requirement_tenantId_status_reminder1At_idx"
ON "Requirement"("tenantId", "status", "reminder1At");

CREATE INDEX "Requirement_tenantId_status_reminder2At_idx"
ON "Requirement"("tenantId", "status", "reminder2At");
