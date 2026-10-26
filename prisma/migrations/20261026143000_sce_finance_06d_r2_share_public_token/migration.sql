-- FIN-06D-R2: reusable capability URL (publicToken) + default-share reuse constraint.

CREATE TYPE "FinancePublicationShareKind" AS ENUM ('DEFAULT', 'ADVANCED');

ALTER TABLE "FinancePublicationShare" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "FinancePublicationShare" ADD COLUMN "shareKind" "FinancePublicationShareKind" NOT NULL DEFAULT 'DEFAULT';

ALTER TABLE "FinancePublicationShare" ALTER COLUMN "tokenHash" DROP NOT NULL;

CREATE UNIQUE INDEX "FinancePublicationShare_publicToken_key" ON "FinancePublicationShare"("publicToken");

CREATE UNIQUE INDEX "FinancePublicationShare_active_default_per_version_key"
  ON "FinancePublicationShare"("tenantId", "publicationVersionId")
  WHERE "revokedAt" IS NULL AND "expiresAt" IS NULL AND "shareKind" = 'DEFAULT';
