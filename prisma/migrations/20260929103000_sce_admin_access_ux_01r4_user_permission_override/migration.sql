-- SCE-ADMIN-ACCESS-UX-01R4: tenant-wide individual permission overrides (ALLOW/DENY)

CREATE TYPE "PermissionOverrideEffect" AS ENUM ('ALLOW', 'DENY');

CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "effect" "PermissionOverrideEffect" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPermissionOverride_tenantId_userId_permissionId_key" ON "UserPermissionOverride"("tenantId", "userId", "permissionId");

CREATE INDEX "UserPermissionOverride_tenantId_userId_idx" ON "UserPermissionOverride"("tenantId", "userId");

CREATE INDEX "UserPermissionOverride_permissionId_idx" ON "UserPermissionOverride"("permissionId");

ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
