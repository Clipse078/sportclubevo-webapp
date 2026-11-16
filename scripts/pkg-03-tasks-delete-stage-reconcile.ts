/**
 * PKG-03 — designated STAGE tasks.delete reconciliation (dry-run only unless --apply).
 *
 * Read-only inventory / proposal (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/pkg-03-tasks-delete-stage-reconcile.ts
 *
 * Apply requires explicit PO-approved apply path (same guard as other permission sync scripts).
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  reconcileTasksDeletePermissionForStagePoTenant,
  TASKS_DELETE_PERMISSION_DEF,
  TASKS_DELETE_STAGE_PO_TENANT_KEY,
} from "@/lib/permissions/tasks-delete-permission-reconciliation";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;

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

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  if (apply) {
    assertOperationalMutationAllowed({
      operationId: "pkg-03-tasks-delete-stage-reconcile",
      databaseUrl: process.env.DATABASE_URL,
      explicitIntent: process.env.APPLY_PERMISSION_SYNC === "true",
      allowedRemoteEnvironments: ["stage"],
    });
  }

  const stageIdentity = assertDesignatedStage();

  const tenant = await prisma.tenant.findUnique({
    where: { key: TASKS_DELETE_STAGE_PO_TENANT_KEY },
    select: { id: true, key: true, name: true },
  });

  const proposal = await reconcileTasksDeletePermissionForStagePoTenant(prisma, {
    dryRun,
    databaseFingerprint: stageIdentity.fingerprint,
    tenantKey: TASKS_DELETE_STAGE_PO_TENANT_KEY,
  });

  const report = {
    mode: dryRun ? "DRY_RUN" : "APPLY",
    databaseFingerprint: stageIdentity.fingerprint,
    databaseHost: stageIdentity.host,
    intendedTenant: tenant
      ? { key: tenant.key, name: tenant.name, id: tenant.id }
      : { key: TASKS_DELETE_STAGE_PO_TENANT_KEY, missing: true },
    permissionRow: {
      ...TASKS_DELETE_PERMISSION_DEF,
      catalogAction: proposal.permission.action,
    },
    roleGrants: proposal.roleGrants.map((g) => ({
      roleKey: g.roleKey,
      permissionKey: g.permissionKey,
      action: g.action,
      grantAlreadyExists: g.action === "already_assigned",
      wouldAssign: g.action === "assigned" || g.action === "permission_not_in_db",
      roleMissing: g.action === "role_not_found",
    })),
    grantCounts: {
      totalRolesConsidered: proposal.roleGrants.length,
      alreadyAssigned: proposal.roleGrants.filter((g) => g.action === "already_assigned").length,
      wouldAssign: proposal.roleGrants.filter(
        (g) => g.action === "assigned" || g.action === "permission_not_in_db",
      ).length,
      roleNotFound: proposal.roleGrants.filter((g) => g.action === "role_not_found").length,
      blockedByMissingPermissionRow: proposal.roleGrants.filter(
        (g) => g.action === "permission_not_in_db",
      ).length,
    },
    approvalRequiredBeforeApply: dryRun,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("[pkg-03-tasks-delete-stage-reconcile] failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());