/**
 * PR #1025 — guarded STAGE reconciliation: tenant_documentation.* on club_admin__fc-allschwil only.
 *
 * Inventory (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-tenant-documentation-stage-club-admin-reconcile.ts
 *
 * Apply:
 *   APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_DATABASE_URL=$STAGE_DIRECT_URL \
 *     APPLY_PERMISSION_SYNC=true \
 *     SCE_OPERATION_AUTHORIZATION=sync-tenant-documentation-club-admin-fca:stage \
 *     npx tsx scripts/sce-tenant-documentation-stage-club-admin-reconcile.ts --apply
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  assertTenantDocumentationClubAdminScopeGate,
  reconcileTenantDocumentationForFcaClubAdmin,
} from "@/lib/permissions/tenant-documentation-club-admin-stage-reconciliation";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const KNOWN_FCA_STAGE_NEON_HOST_FRAGMENTS = ["ep-wispy-hall-aso93dy6"] as const;
const OPERATION_ID = "sync-tenant-documentation-club-admin-fca";

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

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const stage = assertDesignatedStage();

  const proposal = await reconcileTenantDocumentationForFcaClubAdmin(prisma, { dryRun: true });
  const scope = assertTenantDocumentationClubAdminScopeGate(proposal.grants, proposal.roleKey);

  const report: Record<string, unknown> = {
    mode: apply ? "APPLY" : "DRY_RUN",
    operationId: OPERATION_ID,
    databaseFingerprint: stage.fingerprint,
    databaseHost: stage.host,
    roleKey: proposal.roleKey,
    intendedTenantKey: proposal.intendedTenantKey,
    permissionKeys: proposal.permissionKeys,
    grants: proposal.grants,
    scopeGate: {
      passed: scope.passed,
      wouldAssignCount: scope.wouldAssign.length,
      wouldAssign: scope.wouldAssign,
      blockers: scope.blockers,
    },
    catalogSync: false,
    broaderClubAdminReconciliation: false,
  };

  if (!scope.passed) {
    console.log(JSON.stringify(report, null, 2));
    throw new Error("Scope gate failed — refusing write.");
  }

  if (apply) {
    if (scope.wouldAssign.length === 0) {
      report.applied = [];
      console.log(JSON.stringify(report, null, 2));
      console.log("[tenant-doc-fca-club-admin] no missing links; nothing to apply.");
      return;
    }

    const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
    assertOperationalMutationAllowed(
      {
        operationId: OPERATION_ID,
        databaseUrl: connectionString,
        explicitIntent: process.env.APPLY_PERMISSION_SYNC === "true",
        allowedRemoteEnvironments: ["stage"],
        operationSpecificAuthorization: true,
      },
      process.env,
    );

    const applied = await reconcileTenantDocumentationForFcaClubAdmin(prisma, { dryRun: false });
    report.applied = applied.grants.filter((g) => g.action === "assigned");
    report.mode = "APPLY";
  }

  console.log(JSON.stringify(report, null, 2));

  if (apply) {
    return;
  }

  if (scope.wouldAssign.length > 0) {
    console.log(
      "[tenant-doc-fca-club-admin] dry-run complete — apply with --apply and APPLY_PERMISSION_SYNC=true",
    );
  }
}

main()
  .catch((error) => {
    console.error("[tenant-doc-fca-club-admin] failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());