-- SCE-COMM-UX-08A — per-user, per-tenant personal communication signature preference.

CREATE TABLE "UserCommunicationPersonalSignature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bodyText" TEXT,
    "useByDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCommunicationPersonalSignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCommunicationPersonalSignature_tenantId_userId_key" ON "UserCommunicationPersonalSignature"("tenantId", "userId");

CREATE INDEX "UserCommunicationPersonalSignature_tenantId_userId_idx" ON "UserCommunicationPersonalSignature"("tenantId", "userId");

ALTER TABLE "UserCommunicationPersonalSignature" ADD CONSTRAINT "UserCommunicationPersonalSignature_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCommunicationPersonalSignature" ADD CONSTRAINT "UserCommunicationPersonalSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
