-- AUFGABEN-06G1 — Requirements foundation (individual obligation campaigns)

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequirementResponseMode" AS ENUM ('ACKNOWLEDGE');

-- CreateEnum
CREATE TYPE "RequirementResolutionStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RequirementResponseValue" AS ENUM ('ACKNOWLEDGED');

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'REQUIREMENTS';

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "responseMode" "RequirementResponseMode" NOT NULL DEFAULT 'ACKNOWLEDGE',
    "dueAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementDraftAudiencePerson" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDraftAudiencePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "subjectPersonId" TEXT NOT NULL,
    "resolutionStatus" "RequirementResolutionStatus" NOT NULL DEFAULT 'OPEN',
    "responseValue" "RequirementResponseValue",
    "respondedAt" TIMESTAMP(3),
    "respondedByUserId" TEXT,
    "responseActorPersonId" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Requirement_tenantId_idx" ON "Requirement"("tenantId");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_status_idx" ON "Requirement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_dueAt_idx" ON "Requirement"("tenantId", "dueAt");

-- CreateIndex
CREATE INDEX "Requirement_tenantId_status_dueAt_idx" ON "Requirement"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "RequirementDraftAudiencePerson_tenantId_idx" ON "RequirementDraftAudiencePerson"("tenantId");

-- CreateIndex
CREATE INDEX "RequirementDraftAudiencePerson_tenantId_requirementId_idx" ON "RequirementDraftAudiencePerson"("tenantId", "requirementId");

-- CreateIndex
CREATE INDEX "RequirementDraftAudiencePerson_tenantId_personId_idx" ON "RequirementDraftAudiencePerson"("tenantId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementDraftAudiencePerson_requirementId_personId_key" ON "RequirementDraftAudiencePerson"("requirementId", "personId");

-- CreateIndex
CREATE INDEX "RequirementRecipient_tenantId_idx" ON "RequirementRecipient"("tenantId");

-- CreateIndex
CREATE INDEX "RequirementRecipient_tenantId_requirementId_idx" ON "RequirementRecipient"("tenantId", "requirementId");

-- CreateIndex
CREATE INDEX "RequirementRecipient_tenantId_subjectPersonId_idx" ON "RequirementRecipient"("tenantId", "subjectPersonId");

-- CreateIndex
CREATE INDEX "RequirementRecipient_tenantId_requirementId_resolutionStatus_idx" ON "RequirementRecipient"("tenantId", "requirementId", "resolutionStatus");

-- CreateIndex
CREATE INDEX "RequirementRecipient_tenantId_subjectPersonId_resolutionStatus_idx" ON "RequirementRecipient"("tenantId", "subjectPersonId", "resolutionStatus");

-- CreateIndex
CREATE INDEX "RequirementRecipient_requirementId_resolutionStatus_idx" ON "RequirementRecipient"("requirementId", "resolutionStatus");

-- CreateIndex
CREATE INDEX "RequirementRecipient_tenantId_respondedAt_idx" ON "RequirementRecipient"("tenantId", "respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementRecipient_requirementId_subjectPersonId_key" ON "RequirementRecipient"("requirementId", "subjectPersonId");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDraftAudiencePerson" ADD CONSTRAINT "RequirementDraftAudiencePerson_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDraftAudiencePerson" ADD CONSTRAINT "RequirementDraftAudiencePerson_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDraftAudiencePerson" ADD CONSTRAINT "RequirementDraftAudiencePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRecipient" ADD CONSTRAINT "RequirementRecipient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRecipient" ADD CONSTRAINT "RequirementRecipient_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRecipient" ADD CONSTRAINT "RequirementRecipient_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRecipient" ADD CONSTRAINT "RequirementRecipient_respondedByUserId_fkey" FOREIGN KEY ("respondedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRecipient" ADD CONSTRAINT "RequirementRecipient_responseActorPersonId_fkey" FOREIGN KEY ("responseActorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
