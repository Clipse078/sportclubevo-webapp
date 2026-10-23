/**
 * SCE-FIN-03A-R3 — designated STAGE finance permission reconciliation (actuals keys).
 *
 * Read-only inventory (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-03a-r3-stage-permission-reconcile.ts
 *
 * Apply (guarded):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     APPLY_PERMISSION_SYNC=true \
 *     ./node_modules/.bin/tsx scripts/sce-finance-03a-r3-stage-permission-reconcile.ts --apply
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { reconcileFinanceActualPermissionsForClubAdmin } from "@/lib/permissions/finance-permission-reconciliation";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const ACTUAL_PERMISSION_KEYS = [
  PERMISSIONS.FINANCE_ACTUAL_VIEW,
  PERMISSIONS.FINANCE_ACTUAL_MANAGE,
] as const;

function assertDesignatedStage(): { fingerprint: string; host: string } {
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
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const host = new URL(url).hostname.toLowerCase();
  const hostOk = KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS.some((frag) => host.includes(frag));
  if (!hostOk) {
    throw new Error(`Database host ${host} is not a known designated STAGE Neon cluster.`);
  }
  return { fingerprint, host };
}

async function countMissingClubAdminActualPermissions(): Promise<{
  clubAdminRoleCount: number;
  missingAssignments: number;
}> {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...ACTUAL_PERMISSION_KEYS] } },
    select: { id: true, key: true },
  });
  const permissionIds = new Map(permissions.map((p) => [p.key, p.id]));

  const clubAdminRoles = await prisma.role.findMany({
    where: CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE,
    select: { id: true, key: true },
  });

  let missingAssignments = 0;
  for (const role of clubAdminRoles) {
    for (const key of ACTUAL_PERMISSION_KEYS) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) {
        missingAssignments += 1;
        continue;
      }
      const assigned = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        select: { roleId: true },
      });
      if (!assigned) missingAssignments += 1;
    }
  }

  return { clubAdminRoleCount: clubAdminRoles.length, missingAssignments };
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const stage = assertDesignatedStage();
  console.log(
    `[fin-03a-r3] stage host=${stage.host} fingerprint=${stage.fingerprint} mode=${apply ? "apply" : "inventory"}`,
  );

  const before = await countMissingClubAdminActualPermissions();
  console.log(
    `[fin-03a-r3] club_admin__* roles=${before.clubAdminRoleCount} missing actual permission assignments=${before.missingAssignments}`,
  );

  if (!apply) {
    console.log("[fin-03a-r3] inventory only — pass --apply with APPLY_PERMISSION_SYNC=true to reconcile.");
    return;
  }

  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  assertOperationalMutationAllowed(
    {
      operationId: "sync-finance-permissions",
      databaseUrl: connectionString,
      explicitIntent: true,
      allowedRemoteEnvironments: ["acceptance", "stage", "prod"],
      operationSpecificAuthorization: true,
    },
    process.env,
  );

  const outcomes = await reconcileFinanceActualPermissionsForClubAdmin(prisma, false);
  const clubAdminAssigned = outcomes.filter((row) => row.action === "assigned");
  console.log(`[fin-03a-r3] new actual permission grants=${clubAdminAssigned.length}`);

  const after = await countMissingClubAdminActualPermissions();
  console.log(
    `[fin-03a-r3] after: missing actual permission assignments=${after.missingAssignments}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
