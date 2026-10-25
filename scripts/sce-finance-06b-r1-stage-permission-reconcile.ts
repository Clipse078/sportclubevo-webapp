/**
 * SCE-FIN-06B-R1 — designated STAGE finance permission reconciliation (publication keys).
 *
 * Read-only inventory (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06b-r1-stage-permission-reconcile.ts
 *
 * Apply (guarded):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     APPLY_PERMISSION_SYNC=true \
 *     ./node_modules/.bin/tsx scripts/sce-finance-06b-r1-stage-permission-reconcile.ts --apply
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { reconcileFinancePublicationPermissionsForClubAdmin } from "@/lib/permissions/finance-permission-reconciliation";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const PUBLICATION_PERMISSION_KEYS = [
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  PERMISSIONS.FINANCE_SHARE_MANAGE,
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

async function countMissingClubAdminPublicationPermissions(): Promise<{
  clubAdminRoleCount: number;
  missingByKey: Record<string, number>;
  missingAssignments: number;
}> {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...PUBLICATION_PERMISSION_KEYS] } },
    select: { id: true, key: true },
  });
  const permissionIds = new Map(permissions.map((p) => [p.key, p.id]));

  const clubAdminRoles = await prisma.role.findMany({
    where: CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE,
    select: { id: true, key: true },
  });

  const missingByKey: Record<string, number> = Object.fromEntries(
    PUBLICATION_PERMISSION_KEYS.map((key) => [key, 0]),
  );
  let missingAssignments = 0;

  for (const role of clubAdminRoles) {
    for (const key of PUBLICATION_PERMISSION_KEYS) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) {
        missingByKey[key] += 1;
        missingAssignments += 1;
        continue;
      }
      const assigned = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        select: { roleId: true },
      });
      if (!assigned) {
        missingByKey[key] += 1;
        missingAssignments += 1;
      }
    }
  }

  return {
    clubAdminRoleCount: clubAdminRoles.length,
    missingByKey,
    missingAssignments,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  assertDesignatedStage();

  const before = await countMissingClubAdminPublicationPermissions();
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "inventory",
        clubAdminRoleCount: before.clubAdminRoleCount,
        missingByKey: before.missingByKey,
        missingAssignmentsTotal: before.missingAssignments,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log(
      "[fin-06b-r1] inventory only — pass --apply with APPLY_PERMISSION_SYNC=true to reconcile.",
    );
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

  const outcomes = await reconcileFinancePublicationPermissionsForClubAdmin(prisma, false);
  const clubAdminAssigned = outcomes.filter((row) => row.action === "assigned");
  console.log(`[fin-06b-r1] new publication permission grants=${clubAdminAssigned.length}`);

  const after = await countMissingClubAdminPublicationPermissions();
  console.log(
    JSON.stringify(
      {
        missingByKey: after.missingByKey,
        missingAssignmentsTotal: after.missingAssignments,
      },
      null,
      2,
    ),
  );

  if (after.missingAssignments > 0) {
    throw new Error("Publication permission reconciliation incomplete for Club Admin roles.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
