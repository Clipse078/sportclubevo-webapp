-- DASHBOARD-04 — per-user, per-tenant Schnellzugriff preferences
CREATE TABLE "UserDashboardQuickAccessPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinnedKeys" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardQuickAccessPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserDashboardQuickAccessPreference_tenantId_userId_key" ON "UserDashboardQuickAccessPreference"("tenantId", "userId");

CREATE INDEX "UserDashboardQuickAccessPreference_tenantId_userId_idx" ON "UserDashboardQuickAccessPreference"("tenantId", "userId");

ALTER TABLE "UserDashboardQuickAccessPreference" ADD CONSTRAINT "UserDashboardQuickAccessPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserDashboardQuickAccessPreference" ADD CONSTRAINT "UserDashboardQuickAccessPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
