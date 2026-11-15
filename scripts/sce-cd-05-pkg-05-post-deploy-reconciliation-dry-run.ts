/**
 * Read-only dry-run inventory for post-deploy Club Admin reconciliation side effects.
 * Does not write. Requires designated STAGE identity (fingerprint + APP_ENV=stage).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-cd-05-pkg-05-post-deploy-reconciliation-dry-run.ts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const FINANCE_PUBLICATION_KEYS = [
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE,
  PERMISSIONS.FINANCE_SHARE_MANAGE,
] as const;
import { mergeTenantClubAdminAssignedPermissionKeys } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { listExpectedTenantClubAdminDelegatablePermissionKeys } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import { listTenantClubAdminRoleKeysForReconciliation } from "@/lib/permissions/tenant-club-admin-role-discovery";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";

function assertDesignatedStage(): void {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(`STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`);
  }
  if (getRuntimeDataEnvironment() !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  const configured = process.env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase();
  if (configured !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `SCE_DATA_DATABASE_FINGERPRINT must be ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  if (fingerprint !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `Effective database fingerprint ${fingerprint ?? "null"} !== designated STAGE ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!host.includes(EXPECTED_HOST_FRAGMENT)) {
    throw new Error(`Database host ${host} is not the designated STAGE Neon cluster.`);
  }
}

async function main(): Promise<void> {
  assertDesignatedStage();

  const connectionString =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { key: true },
      orderBy: { key: "asc" },
    });
    const roleKeys = await listTenantClubAdminRoleKeysForReconciliation(prisma);
    const expectedDelegatable = await listExpectedTenantClubAdminDelegatablePermissionKeys(prisma);

    const expectedAssigned = mergeTenantClubAdminAssignedPermissionKeys(expectedDelegatable);
    const roles = await prisma.role.findMany({
      where: { key: { in: roleKeys } },
      select: { id: true, key: true },
    });
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...expectedAssigned] } },
      select: { id: true, key: true },
    });
    const financePubKeys = [...FINANCE_PUBLICATION_KEYS];
    const financePerms = await prisma.permission.findMany({
      where: { key: { in: financePubKeys } },
      select: { key: true },
    });
    const financeKeysMissingFromCatalog = financePubKeys.filter(
      (key) => !financePerms.some((row) => row.key === key),
    );

    const roleIds = roles.map((role) => role.id);
    const permissionIds = permissions.map((permission) => permission.id);
    const existingPairCount =
      roleIds.length === 0 || permissionIds.length === 0
        ? 0
        : await prisma.rolePermission.count({
            where: { roleId: { in: roleIds }, permissionId: { in: permissionIds } },
          });
    const theoreticalPairs = roleIds.length * permissionIds.length;
    const missingCatalogPairs = theoreticalPairs - existingPairCount;

    console.log(
      JSON.stringify(
        {
          writePerformed: false,
          dryRunMode: true,
          mirrorsPostDeployScript:
            "scripts/post-deploy-tenant-club-admin-reconciliation.ts (live run uses dryRun=false)",
          activeTenants: {
            count: tenants.length,
            keys: tenants.map((t) => t.key),
          },
          clubAdminRolesTargeted: {
            count: roleKeys.length,
            keys: roleKeys,
          },
          expectedDelegatablePermissionCount: expectedDelegatable.length,
          expectedAssignedPermissionCount: expectedAssigned.length,
          permissionCatalogRowsWouldCreate: financeKeysMissingFromCatalog,
          wouldInsertRolePermissionRows: {
            missingCatalogPairs,
            theoreticalCatalogPairs: theoreticalPairs,
            note: "Publication/distribute passes are subsets of the full catalog pass.",
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});