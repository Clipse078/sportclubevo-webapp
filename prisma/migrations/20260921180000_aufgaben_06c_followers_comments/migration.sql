-- AUFGABEN-06C — Task followers + TASK_COMMENT notifications (additive).

ALTER TYPE "NotificationType" ADD VALUE 'TASK_COMMENT';

CREATE TABLE "TaskFollower" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskFollower_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskFollower_tenantId_idx" ON "TaskFollower"("tenantId");

CREATE INDEX "TaskFollower_tenantId_taskId_idx" ON "TaskFollower"("tenantId", "taskId");

CREATE INDEX "TaskFollower_tenantId_userId_idx" ON "TaskFollower"("tenantId", "userId");

CREATE UNIQUE INDEX "TaskFollower_taskId_userId_key" ON "TaskFollower"("taskId", "userId");

ALTER TABLE "TaskFollower" ADD CONSTRAINT "TaskFollower_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskFollower" ADD CONSTRAINT "TaskFollower_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskFollower" ADD CONSTRAINT "TaskFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
