/**
 * SCE public reference backfill — CLI guards and reporting (#1021 follow-up).
 */

import type { PrismaClient } from "@prisma/client";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  assertOperationalMutationAllowed,
  classifyDatabaseTarget,
} from "@/lib/server/operational-database-guard";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { findScePublicNumberCollisions } from "@/lib/club-development/sce-public-reference";
import {
  loadScePublicReferenceBackfillRows,
  runScePublicReferenceBackfill,
  type ScePublicReferenceBackfillRow,
} from "@/lib/club-development/sce-public-reference-backfill";

export const SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID =
  "sce-public-reference-backfill" as const;

export type ScePublicReferenceBackfillCliInput = {
  dryRun: boolean;
  tenantFilter: string | null;
  databaseUrl: string | undefined;
  env?: NodeJS.ProcessEnv;
};

function assertDesignatedStageDatabase(env: NodeJS.ProcessEnv): void {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "production",
  });
  if (runtime.appEnv !== "stage") {
    throw new Error(`STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`);
  }
  if (getRuntimeDataEnvironment(env) !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const configured = env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase();
  if (configured !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `SCE_DATA_DATABASE_FINGERPRINT must be ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(env);
  if (fingerprint !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `Effective database fingerprint ${fingerprint ?? "null"} !== designated STAGE ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
}

export function assertScePublicReferenceBackfillAllowed(
  input: ScePublicReferenceBackfillCliInput,
): void {
  const env = input.env ?? process.env;
  const connectionString = input.databaseUrl?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const databaseTarget = classifyDatabaseTarget(connectionString);
  if (databaseTarget === "unknown") {
    throw new Error("DATABASE_URL is missing, malformed, or unsupported.");
  }

  if (databaseTarget === "remote") {
    assertDesignatedStageDatabase(env);
    if (!input.dryRun) {
      assertOperationalMutationAllowed(
        {
          operationId: SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID,
          databaseUrl: connectionString,
          explicitIntent: true,
          allowedRemoteEnvironments: ["stage"],
        },
        env,
      );
    }
    return;
  }

  if (!input.dryRun) {
    assertOperationalMutationAllowed(
      {
        operationId: SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID,
        databaseUrl: connectionString,
        explicitIntent: true,
      },
      env,
    );
  }
}

export function summarizeBackfillCandidates(rows: ScePublicReferenceBackfillRow[]) {
  const byKind: Record<ScePublicReferenceBackfillRow["kind"], number> = {
    strategy: 0,
    target: 0,
    task: 0,
    meldung: 0,
  };
  const byTenant: Record<
    string,
    Record<ScePublicReferenceBackfillRow["kind"], number>
  > = {};

  for (const row of rows) {
    byKind[row.kind] += 1;
    if (!byTenant[row.tenantId]) {
      byTenant[row.tenantId] = { strategy: 0, target: 0, task: 0, meldung: 0 };
    }
    byTenant[row.tenantId][row.kind] += 1;
  }

  const tenantIds = Object.keys(byTenant);
  return {
    total: rows.length,
    tenantCount: tenantIds.length,
    byKind,
    byTenant,
    tenantKeys: tenantIds,
  };
}

export function buildGuardedLiveCommand(options?: { tenantId?: string | null }): string {
  const tenant = options?.tenantId?.trim();
  const tenantArg = tenant ? ` --tenant ${tenant}` : "";
  return [
    "APP_ENV=stage",
    "SCE_DATA_ENVIRONMENT=STAGE",
    `SCE_DATA_DATABASE_FINGERPRINT=${STAGE_CANONICAL_DATABASE_FINGERPRINT}`,
    `SCE_OPERATION_AUTHORIZATION=${SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID}:stage`,
    "DATABASE_URL=$STAGE_DB_URL",
    "DIRECT_URL=$STAGE_DIRECT_URL",
    `npx tsx scripts/sce-public-reference-backfill.ts${tenantArg}`,
  ].join(" ");
}

export async function runScePublicReferenceBackfillCli(
  prisma: PrismaClient,
  input: ScePublicReferenceBackfillCliInput,
) {
  const tenantFilter = input.tenantFilter?.trim() || null;
  const collisions = await findScePublicNumberCollisions(prisma);
  const candidates = await loadScePublicReferenceBackfillRows(prisma, tenantFilter);
  const candidateSummary = summarizeBackfillCandidates(candidates);

  const result = await runScePublicReferenceBackfill(prisma, {
    tenantFilter,
    dryRun: input.dryRun,
  });

  return {
    dryRun: input.dryRun,
    tenantFilter,
    candidateSummary,
    collisions: collisions.map((row) => ({
      scePublicNumber: row.scePublicNumber.toString(),
      occurrences: row.occurrences,
    })),
    assigned: result.assigned,
    tenantCount: result.tenantCount,
    collisionAbort: result.collisions.length > 0,
    guardedLiveCommand: buildGuardedLiveCommand({ tenantId: tenantFilter }),
  };
}