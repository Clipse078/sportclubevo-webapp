-- CreateTable
CREATE TABLE "DevelopmentPlannedSprintRank" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentPlannedSprintRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentPlannedSprintRank_sprintId_key" ON "DevelopmentPlannedSprintRank"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentPlannedSprintRank_tenantId_sprintId_key" ON "DevelopmentPlannedSprintRank"("tenantId", "sprintId");

-- CreateIndex
CREATE INDEX "DevelopmentPlannedSprintRank_tenantId_rank_idx" ON "DevelopmentPlannedSprintRank"("tenantId", "rank");

-- AddForeignKey
ALTER TABLE "DevelopmentPlannedSprintRank" ADD CONSTRAINT "DevelopmentPlannedSprintRank_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentPlannedSprintRank" ADD CONSTRAINT "DevelopmentPlannedSprintRank_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "DevelopmentSprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;