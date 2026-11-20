/**
 * PR #1017 — read-only post-migration Club Admin reconciliation outcome inventory.
 * Does not run reconciliation or mutate data. Mirrors post-deploy passes:
 *   1) FIN-06 publication keys
 *   2) FIN-06E distribute key
 *   3) Tenant Club Admin catalog pass
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { mergeTenantClubAdminAssignedPermissionKeys } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { listExpectedTenantClubAdminDelegatablePermissionKeys } from "@/lib/permissions/tenant-club-admin-permission-reconciliation";
import { listTenantClubAdminRoleKeysForReconciliation } from "@/lib/permissions/tenant-club-admin-role-discovery";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

const FINANCE_PUBLICATION_KEYS = [
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE,
  PERMISSIONS.FINANCE_SHARE_MANAGE,
] as const;

const DISTRIBUTE_KEYS = [PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE] as const;

function assertDesignatedStage(): void {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(`APP_ENV must be stage (got ${runtime.appEnv}).`);
  }
  if (getRuntimeDataEnvironment() !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  if (fingerprint !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `Fingerprint ${fingerprint ?? "null"} !== designated STAGE ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
}

async function main(): Promise<void> {
  assertDesignatedStage();
  const connectionString =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const roleKeys = await listTenantClubAdminRoleKeysForReconciliation(prisma);
    const roles = await prisma.role.findMany({
      where: { key: { in: roleKeys } },
      select: { id: true, key: true },
    });
    const publicationPermissions = await prisma.permission.findMany({
      where: { key: { in: [...FINANCE_PUBLICATION_KEYS] } },
      select: { id: true, key: true },
    });
    const distributePermissions = await prisma.permission.findMany({
      where: { key: { in: [...DISTRIBUTE_KEYS] } },
      select: { id: true, key: true },
    });

    const publicationPairs = await prisma.rolePermission.count({
      where: {
        roleId: { in: roles.map((row) => row.id) },
        permissionId: { in: publicationPermissions.map((row) => row.id) },
      },
    });
    const distributePairs = await prisma.rolePermission.count({
      where: {
        roleId: { in: roles.map((row) => row.id) },
        permissionId: { in: distributePermissions.map((row) => row.id) },
      },
    });

    const delegatable = await listExpectedTenantClubAdminDelegatablePermissionKeys(prisma);
    const assignedKeys = mergeTenantClubAdminAssignedPermissionKeys(delegatable);
    const assignedPermissions = await prisma.permission.findMany({
      where: { key: { in: assignedKeys } },
      select: { id: true, key: true },
    });
    const catalogPairs = await prisma.rolePermission.count({
      where: {
        roleId: { in: roles.map((row) => row.id) },
        permissionId: { in: assignedPermissions.map((row) => row.id) },
      },
    });

    const theoreticalPublication = roles.length * publicationPermissions.length;
    const theoreticalDistribute = roles.length * distributePermissions.length;
    const theoreticalCatalog = roles.length * assignedPermissions.length;

    const passes = [
      {
        id: "fin-06-publication",
        missingPairs: Math.max(0, theoreticalPublication - publicationPairs),
        actualAssignedDelta: 0,
        inventoryPairs: publicationPairs,
        theoreticalPairs: theoreticalPublication,
      },
      {
        id: "fin-06e-distribute",
        missingPairs: Math.max(0, theoreticalDistribute - distributePairs),
        actualAssignedDelta: 0,
        inventoryPairs: distributePairs,
        theoreticalPairs: theoreticalDistribute,
      },
      {
        id: "tenant-club-admin-catalog",
        missingPairs: Math.max(0, theoreticalCatalog - catalogPairs),
        actualAssignedDelta: 0,
        inventoryPairs: catalogPairs,
        theoreticalPairs: theoreticalCatalog,
      },
    ];

    const finalOutcome =
      passes.every((pass) => pass.missingPairs === 0) ? "COMPLETE" : "INCOMPLETE";

    console.log(
      JSON.stringify(
        {
          pullRequest: 1017,
          writePerformed: false,
          designatedStageFingerprint: STAGE_CANONICAL_DATABASE_FINGERPRINT,
          reconciliationPasses: passes,
          finalOutcome,
          permissionDeltaAcrossPasses: {
            assigned: passes.reduce((sum, pass) => sum + pass.actualAssignedDelta, 0),
            remainingMissingPairs: passes.reduce((sum, pass) => sum + pass.missingPairs, 0),
          },
          note: "Inventory-only — does not invoke live reconcile* functions.",
        },
        null,
        2,
      ),
    );

    if (finalOutcome !== "COMPLETE") process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});