-- SCE-CD-04 — strategy overview, initiative backlog, milestones, development sprints (additive).

CREATE TYPE "InitiativeDisposition" AS ENUM ('NONE', 'DEFERRED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "DevelopmentSprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');
CREATE TYPE "InitiativeMilestoneStatus" AS ENUM ('OPEN', 'DONE');

ALTER TABLE "Initiative" ADD COLUMN "expectedOutcome" TEXT;
ALTER TABLE "Initiative" ADD COLUMN "backlogPriority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Initiative" ADD COLUMN "disposition" "InitiativeDisposition" NOT NULL DEFAULT 'NONE';

CREATE INDEX "Initiative_tenantId_backlogPriority_idx" ON "Initiative"("tenantId", "backlogPriority");
CREATE INDEX "Initiative_tenantId_disposition_idx" ON "Initiative"("tenantId", "disposition");

CREATE TABLE "InitiativeMilestone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "InitiativeMilestoneStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InitiativeTargetLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeTargetLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevelopmentSprint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT,
    "status" "DevelopmentSprintStatus" NOT NULL DEFAULT 'PLANNED',
    "owner" TEXT,
    "ownerPersonId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'ORGANISATION',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentSprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevelopmentSprintTaskMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedAfterSprintStart" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "DevelopmentSprintTaskMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InitiativeTargetLink_initiativeId_targetId_key" ON "InitiativeTargetLink"("initiativeId", "targetId");
CREATE INDEX "InitiativeTargetLink_tenantId_idx" ON "InitiativeTargetLink"("tenantId");
CREATE INDEX "InitiativeTargetLink_tenantId_targetId_idx" ON "InitiativeTargetLink"("tenantId", "targetId");
CREATE INDEX "InitiativeTargetLink_tenantId_initiativeId_idx" ON "InitiativeTargetLink"("tenantId", "initiativeId");

CREATE INDEX "InitiativeMilestone_tenantId_idx" ON "InitiativeMilestone"("tenantId");
CREATE INDEX "InitiativeMilestone_tenantId_initiativeId_idx" ON "InitiativeMilestone"("tenantId", "initiativeId");
CREATE INDEX "InitiativeMilestone_initiativeId_sortOrder_idx" ON "InitiativeMilestone"("initiativeId", "sortOrder");

CREATE UNIQUE INDEX "DevelopmentSprint_tenantId_slug_key" ON "DevelopmentSprint"("tenantId", "slug");
CREATE INDEX "DevelopmentSprint_tenantId_idx" ON "DevelopmentSprint"("tenantId");
CREATE INDEX "DevelopmentSprint_tenantId_status_idx" ON "DevelopmentSprint"("tenantId", "status");
CREATE INDEX "DevelopmentSprint_visibilityScope_idx" ON "DevelopmentSprint"("visibilityScope");

CREATE INDEX "DevelopmentSprintTaskMembership_tenantId_idx" ON "DevelopmentSprintTaskMembership"("tenantId");
CREATE INDEX "DevelopmentSprintTaskMembership_tenantId_sprintId_idx" ON "DevelopmentSprintTaskMembership"("tenantId", "sprintId");
CREATE INDEX "DevelopmentSprintTaskMembership_sprintId_removedAt_idx" ON "DevelopmentSprintTaskMembership"("sprintId", "removedAt");
CREATE INDEX "DevelopmentSprintTaskMembership_tenantId_taskId_idx" ON "DevelopmentSprintTaskMembership"("tenantId", "taskId");

ALTER TABLE "InitiativeMilestone" ADD CONSTRAINT "InitiativeMilestone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InitiativeMilestone" ADD CONSTRAINT "InitiativeMilestone_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InitiativeTargetLink" ADD CONSTRAINT "InitiativeTargetLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InitiativeTargetLink" ADD CONSTRAINT "InitiativeTargetLink_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InitiativeTargetLink" ADD CONSTRAINT "InitiativeTargetLink_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevelopmentSprint" ADD CONSTRAINT "DevelopmentSprint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DevelopmentSprintTaskMembership" ADD CONSTRAINT "DevelopmentSprintTaskMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentSprintTaskMembership" ADD CONSTRAINT "DevelopmentSprintTaskMembership_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "DevelopmentSprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentSprintTaskMembership" ADD CONSTRAINT "DevelopmentSprintTaskMembership_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
