-- CreateTable
CREATE TABLE "DevelopmentUnplannedTaskRank" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentUnplannedTaskRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentUnplannedTaskRank_taskId_key" ON "DevelopmentUnplannedTaskRank"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentUnplannedTaskRank_tenantId_taskId_key" ON "DevelopmentUnplannedTaskRank"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "DevelopmentUnplannedTaskRank_tenantId_rank_idx" ON "DevelopmentUnplannedTaskRank"("tenantId", "rank");

-- AddForeignKey
ALTER TABLE "DevelopmentUnplannedTaskRank" ADD CONSTRAINT "DevelopmentUnplannedTaskRank_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentUnplannedTaskRank" ADD CONSTRAINT "DevelopmentUnplannedTaskRank_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;