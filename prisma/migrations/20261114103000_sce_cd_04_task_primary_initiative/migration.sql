-- SCE-CD-04 — optional primary initiative on Task (context-preserving association).
-- NOT executed on shared environments by agents; apply via deployment pipeline.

ALTER TABLE "Task" ADD COLUMN "primaryInitiativeId" TEXT;

CREATE INDEX "Task_tenantId_primaryInitiativeId_idx" ON "Task"("tenantId", "primaryInitiativeId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_primaryInitiativeId_fkey" FOREIGN KEY ("primaryInitiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;