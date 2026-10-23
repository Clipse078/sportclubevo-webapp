/**
 * SCE-FIN-04A-R1 — designated STAGE finance permission reconciliation (forecast keys).
 *
 * Read-only inventory (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04a-r1-stage-permission-reconcile.ts
 *
 * Apply (guarded):
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     APPLY_PERMISSION_SYNC=true \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04a-r1-stage-permission-reconcile.ts --apply
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { reconcileFinanceForecastPermissionsForClubAdmin } from "@/lib/permissions/finance-permission-reconciliation";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

const FORECAST_PERMISSION_KEYS = [
  PERMISSIONS.FINANCE_FORECAST_VIEW,
  PERMISSIONS.FINANCE_FORECAST_MANAGE,
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

async function countMissingClubAdminForecastPermissions(): Promise<{
  clubAdminRoleCount: number;
  missingForecastView: number;
  missingForecastManage: number;
  missingAssignments: number;
}> {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...FORECAST_PERMISSION_KEYS] } },
    select: { id: true, key: true },
  });
  const permissionIds = new Map(permissions.map((p) => [p.key, p.id]));

  const clubAdminRoles = await prisma.role.findMany({
    where: CANONICAL_TENANT_CLUB_ADMIN_ROLE_WHERE,
    select: { id: true, key: true },
  });

  let missingForecastView = 0;
  let missingForecastManage = 0;
  for (const role of clubAdminRoles) {
    for (const key of FORECAST_PERMISSION_KEYS) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) {
        if (key === PERMISSIONS.FINANCE_FORECAST_VIEW) missingForecastView += 1;
        if (key === PERMISSIONS.FINANCE_FORECAST_MANAGE) missingForecastManage += 1;
        continue;
      }
      const assigned = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        select: { roleId: true },
      });
      if (!assigned) {
        if (key === PERMISSIONS.FINANCE_FORECAST_VIEW) missingForecastView += 1;
        if (key === PERMISSIONS.FINANCE_FORECAST_MANAGE) missingForecastManage += 1;
      }
    }
  }

  return {
    clubAdminRoleCount: clubAdminRoles.length,
    missingForecastView,
    missingForecastManage,
    missingAssignments: missingForecastView + missingForecastManage,
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const stage = assertDesignatedStage();
  console.log(
    `[fin-04a-r1] stage host=${stage.host} fingerprint=${stage.fingerprint} mode=${apply ? "apply" : "inventory"}`,
  );

  const before = await countMissingClubAdminForecastPermissions();
  console.log(
    JSON.stringify(
      {
        clubAdminRoleCount: before.clubAdminRoleCount,
        missingFinanceForecastView: before.missingForecastView,
        missingFinanceForecastManage: before.missingForecastManage,
        missingAssignmentsTotal: before.missingAssignments,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log(
      "[fin-04a-r1] inventory only — pass --apply with APPLY_PERMISSION_SYNC=true to reconcile.",
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

  const outcomes = await reconcileFinanceForecastPermissionsForClubAdmin(prisma, false);
  const clubAdminAssigned = outcomes.filter((row) => row.action === "assigned");
  console.log(`[fin-04a-r1] new forecast permission grants=${clubAdminAssigned.length}`);

  const after = await countMissingClubAdminForecastPermissions();
  console.log(
    JSON.stringify(
      {
        missingFinanceForecastView: after.missingForecastView,
        missingFinanceForecastManage: after.missingForecastManage,
        missingAssignmentsTotal: after.missingAssignments,
      },
      null,
      2,
    ),
  );

  if (after.missingForecastView > 0 || after.missingForecastManage > 0) {
    throw new Error("Forecast permission reconciliation incomplete for Club Admin roles.");
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
