-- AUFGABEN-05-ORG-01 — organisational ownership + visibility persistence foundation

-- CreateEnum
CREATE TYPE "TaskVisibilityScope" AS ENUM ('ASSIGNEES_ONLY', 'ORG_UNIT', 'CLUB');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "orgUnitId" TEXT,
ADD COLUMN     "visibilityScope" "TaskVisibilityScope" NOT NULL DEFAULT 'CLUB';

-- AlterTable
ALTER TABLE "TaskSeries" ADD COLUMN     "orgUnitId" TEXT,
ADD COLUMN     "visibilityScope" "TaskVisibilityScope" NOT NULL DEFAULT 'CLUB';

-- CreateIndex
CREATE INDEX "Task_tenantId_visibilityScope_idx" ON "Task"("tenantId", "visibilityScope");

-- CreateIndex
CREATE INDEX "Task_tenantId_orgUnitId_idx" ON "Task"("tenantId", "orgUnitId");

-- CreateIndex
CREATE INDEX "Task_tenantId_orgUnitId_visibilityScope_idx" ON "Task"("tenantId", "orgUnitId", "visibilityScope");

-- CreateIndex
CREATE INDEX "TaskSeries_tenantId_visibilityScope_idx" ON "TaskSeries"("tenantId", "visibilityScope");

-- CreateIndex
CREATE INDEX "TaskSeries_tenantId_orgUnitId_idx" ON "TaskSeries"("tenantId", "orgUnitId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeries" ADD CONSTRAINT "TaskSeries_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
