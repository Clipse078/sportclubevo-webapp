-- FIN-06E: publication distribution & email delivery

-- AlterEnum
ALTER TYPE "FinancePublicationShareKind" ADD VALUE 'DISTRIBUTION';

-- CreateEnum
CREATE TYPE "FinancePublicationDistributionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');
CREATE TYPE "FinancePublicationDistributionRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "FinancePublicationDistribution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "publicationVersionId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "optionalMessage" VARCHAR(500),
    "status" "FinancePublicationDistributionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "localeCode" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FinancePublicationDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancePublicationDistributionRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "personId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientDisplayName" TEXT,
    "isExternalRecipient" BOOLEAN NOT NULL DEFAULT false,
    "publicationShareId" TEXT,
    "status" "FinancePublicationDistributionRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "deliveryMetadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancePublicationDistributionRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancePublicationDistribution_tenantId_idempotencyKey_key" ON "FinancePublicationDistribution"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancePublicationDistribution_tenantId_publicationVersionId_createdAt_idx" ON "FinancePublicationDistribution"("tenantId", "publicationVersionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FinancePublicationDistribution_tenantId_publicationId_idx" ON "FinancePublicationDistribution"("tenantId", "publicationId");

-- CreateIndex
CREATE INDEX "FinancePublicationDistributionRecipient_tenantId_distributionId_idx" ON "FinancePublicationDistributionRecipient"("tenantId", "distributionId");

-- CreateIndex
CREATE INDEX "FinancePublicationDistributionRecipient_tenantId_publicationShareId_idx" ON "FinancePublicationDistributionRecipient"("tenantId", "publicationShareId");

-- CreateIndex
CREATE INDEX "FinancePublicationDistributionRecipient_distributionId_status_idx" ON "FinancePublicationDistributionRecipient"("distributionId", "status");

-- AddForeignKey
ALTER TABLE "FinancePublicationDistribution" ADD CONSTRAINT "FinancePublicationDistribution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistribution" ADD CONSTRAINT "FinancePublicationDistribution_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "FinancePublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistribution" ADD CONSTRAINT "FinancePublicationDistribution_publicationVersionId_fkey" FOREIGN KEY ("publicationVersionId") REFERENCES "FinancePublicationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistribution" ADD CONSTRAINT "FinancePublicationDistribution_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistributionRecipient" ADD CONSTRAINT "FinancePublicationDistributionRecipient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistributionRecipient" ADD CONSTRAINT "FinancePublicationDistributionRecipient_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "FinancePublicationDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistributionRecipient" ADD CONSTRAINT "FinancePublicationDistributionRecipient_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePublicationDistributionRecipient" ADD CONSTRAINT "FinancePublicationDistributionRecipient_publicationShareId_fkey" FOREIGN KEY ("publicationShareId") REFERENCES "FinancePublicationShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
