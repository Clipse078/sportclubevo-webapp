/**
 * PR #1017 — read-only STAGE / PR Preview migration inventory for connected Vereinsentwicklung.
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-cd-connected-workspace-stage-migration-verify-readonly.ts
 *
 * No schema writes. Never logs credentials.
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { getRuntimeEnvironment } from "@/lib/env";
import { CONNECTED_WORKSPACE_PO_UAT_HANDOFF } from "@/lib/club-development/sce-cd-connected-workspace-po-uat-handoff";

const MIGRATION = CONNECTED_WORKSPACE_PO_UAT_HANDOFF.requiredMigration;
const JUNCTION_MIGRATION = CONNECTED_WORKSPACE_PO_UAT_HANDOFF.orgUnitAssignmentMigration;
const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const KNOWN_PREVIEW_NOTE =
  "PR Preview for sportclubevo-webapp-stage uses the shared STAGE Neon database (see docs/deployment/stage-preview-migration-runbook.md). No branch-scoped isolated Preview database is provisioned in-repo.";

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

async function main(): Promise<void> {
  const runtime = getRuntimeEnvironment(process.env);
  const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource(process.env);
  const dataEnv = getRuntimeDataEnvironment();

  let host: string | null = null;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    host = null;
  }

  const applied = await prisma.$queryRaw<
    Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name IN (${MIGRATION}, ${JUNCTION_MIGRATION})
  `;

  const junctionTable = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ClubStrategyOrgUnitAssignment'
    ) AS exists
  `;

  const scopeColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ClubStrategy'
      AND column_name IN ('scopeType', 'scopeOrgUnitId', 'title')
    ORDER BY column_name
  `;

  const targetEnum = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'TaskContextType' AND e.enumlabel = 'TARGET'
    ) AS exists
  `;

  const scopeEnum = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'ClubStrategyScopeType'
    ) AS exists
  `;

  const baseLoaderProbe = await prisma.clubStrategy
    .findFirst({
      where: { tenantId: "probe-tenant-never-exists" },
      select: { id: true, scopeType: true, title: true },
    })
    .then(() => ({ ok: true, errorCode: null as string | null }))
    .catch((error: unknown) => ({
      ok: false,
      errorCode: error instanceof Error ? error.message.slice(0, 120) : "unknown",
    }));

  const junctionLoaderProbe = await prisma.clubStrategy
    .findFirst({
      where: { tenantId: "probe-tenant-never-exists" },
      select: { id: true, orgUnitAssignments: { select: { orgUnitId: true } } },
    })
    .then(() => ({ ok: true, errorCode: null as string | null }))
    .catch((error: unknown) => ({
      ok: false,
      errorCode: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    }));

  const repoChecksum = migrationChecksum(MIGRATION);
  const junctionRepoChecksum = migrationChecksum(JUNCTION_MIGRATION);
  const row = applied.find((r) => r.migration_name === MIGRATION && r.finished_at && !r.rolled_back_at);
  const junctionRow = applied.find(
    (r) => r.migration_name === JUNCTION_MIGRATION && r.finished_at && !r.rolled_back_at,
  );
  const columnSet = new Set(scopeColumns.map((c) => c.column_name));

  console.log(
    JSON.stringify(
      {
        pullRequest: CONNECTED_WORKSPACE_PO_UAT_HANDOFF,
        previewDatabaseNote: KNOWN_PREVIEW_NOTE,
        branchScopedIsolatedPreviewDatabase: {
          supportedInRepository: false,
          isolatedAlternative: "Vercel Custom Environment `acceptance` + sce_acceptance (see docs/deployment/acceptance-environment-runbook.md)",
        },
        databaseIdentity: {
          appEnv: runtime.appEnv,
          dataEnvironment: dataEnv,
          hostFragmentMatch: Boolean(host?.includes(EXPECTED_HOST_FRAGMENT)),
          fingerprint,
          fingerprintMatch: fingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT,
          designatedStageFingerprint: STAGE_CANONICAL_DATABASE_FINGERPRINT,
        },
        migration: {
          name: MIGRATION,
          applied: Boolean(row),
          checksumInDb: row?.checksum ?? null,
          checksumMatch: row?.checksum === repoChecksum,
          repoChecksum,
          finishedAt: row?.finished_at?.toISOString?.() ?? null,
          prismaMigrateStatusHint:
            "Run APP_ENV=stage NODE_ENV=production npx prisma migrate status — expect this migration as sole repo-pending migration after 20261120120000_sce_anliegen_01_foundation.",
        },
        schemaReady: {
          clubStrategyScopeTypeEnum: scopeEnum[0]?.exists ?? false,
          clubStrategyScopeColumns: {
            scopeType: columnSet.has("scopeType"),
            scopeOrgUnitId: columnSet.has("scopeOrgUnitId"),
            title: columnSet.has("title"),
          },
          taskContextTargetEnum: targetEnum[0]?.exists ?? false,
        },
        orgUnitAssignmentMigration: {
          name: JUNCTION_MIGRATION,
          applied: Boolean(junctionRow),
          tableExists: junctionTable[0]?.exists ?? false,
          checksumInDb: junctionRow?.checksum ?? null,
          checksumMatch: junctionRow?.checksum === junctionRepoChecksum,
          repoChecksum: junctionRepoChecksum,
          finishedAt: junctionRow?.finished_at?.toISOString?.() ?? null,
        },
        loaderPathProbe: {
          clubStrategyWithoutJunction: baseLoaderProbe,
          clubStrategyWithOrgUnitAssignments: junctionLoaderProbe,
          blocksStrategienAndZieleOnPreview: !baseLoaderProbe.ok || !junctionLoaderProbe.ok,
        },
        routesRequiringOrgUnitJunctionForReads: [
          "/vereinsleitung/strategie-und-ziele?ansicht=strategie",
          "/vereinsleitung/strategie-und-ziele?ansicht=strategie&strategyId=…",
          "/vereinsleitung/club-entwicklung (Strategien delivery progress)",
          "GET /api/club-development/club-strategies",
          "POST /api/club-development/club-strategies (multi Org-Einheit create)",
          "PATCH /api/club-development/club-strategies (Org-Einheit replace)",
        ],
        fixtureInventoryOnStageFcAllschwil: await (async () => {
          const tenant = await prisma.tenant.findFirst({
            where: { key: "fc-allschwil" },
            select: { id: true },
          });
          if (!tenant) {
            return {
              note: "fc-allschwil tenant not found.",
              requiresSeparateFixtureApproval: true,
            };
          }
          const [targetCount, sprintCount, orgUnitCount] = await Promise.all([
            prisma.target.count({ where: { tenantId: tenant.id } }),
            prisma.developmentSprint.count({ where: { tenantId: tenant.id } }),
            prisma.orgUnit.count({ where: { tenantId: tenant.id } }),
          ]);
          return {
            tenantKey: "fc-allschwil",
            orgUnitCount,
            targetCount,
            sprintCount,
            note: "Acceptance ledger fixture IDs are not on STAGE; PO sprint/target deep links need an approved STAGE seed or manual PO-created records.",
            requiresSeparateFixtureApproval: targetCount === 0 || sprintCount === 0,
          };
        })(),
        guardedApplyProcedure: {
          reference: "docs/deployment/stage-preview-migration-runbook.md",
          command:
            "APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled",
          constraints: [
            "Confirm fingerprint acd3b37682911890 before any write.",
            "Preview deployments never set APPLY_DATABASE_MIGRATIONS.",
            "Additive-only migration — existing ClubStrategy row becomes scopeType=CLUB via DEFAULT.",
          ],
        },
        writePerformed: false,
      },
      null,
      2,
    ),
  );

  if (!row || !columnSet.has("scopeType") || !junctionRow || !(junctionTable[0]?.exists ?? false)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));