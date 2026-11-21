/**
 * PR #1025 — read-only STAGE migration + permission-sync prerequisites (no writes).
 *
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     DATABASE_URL=$STAGE_DB_URL DIRECT_URL=$STAGE_DIRECT_URL \
 *     npx tsx scripts/sce-tenant-documentation-stage-migration-verify-readonly.ts
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER,
  SCE_TENANT_DOCUMENTATION_PERMISSION_SYNC_OPERATION,
} from "@/lib/tenant-documentation/sce-tenant-documentation-migration-handoff";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

const EXPECTED_HOST_FRAGMENT = "ep-wispy-hall-aso93dy6";
const KNOWN_PREVIEW_NOTE =
  "PR Preview for sportclubevo-webapp-stage uses the shared STAGE Neon database (see docs/deployment/stage-preview-migration-runbook.md).";

const TENANT_DOC_PERMISSION_KEYS = [
  "tenant_documentation.view",
  "tenant_documentation.edit",
  "tenant_documentation.publish",
  "tenant_documentation.manage",
] as const;

function migrationChecksum(name: string): string {
  const sqlPath = path.join(process.cwd(), `prisma/migrations/${name}/migration.sql`);
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

function assertDesignatedStageReadOnly(): void {
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
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function main(): Promise<void> {
  assertDesignatedStageReadOnly();

  let host: string | null = null;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    host = null;
  }

  const applied = await prisma.$queryRaw<
    Array<{
      migration_name: string;
      checksum: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>
  >`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name IN (${SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER[0]}, ${SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER[1]})
  `;

  const repoChecksums = Object.fromEntries(
    SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER.map((m) => [m, migrationChecksum(m)]),
  );

  const migrationReport = SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER.map((name) => {
    const row = applied.find((r) => r.migration_name === name && r.finished_at && !r.rolled_back_at);
    return {
      name,
      applied: Boolean(row),
      checksumInDb: row?.checksum ?? null,
      repoChecksum: repoChecksums[name],
      checksumMatch: row?.checksum === repoChecksums[name],
      finishedAt: row?.finished_at?.toISOString?.() ?? null,
    };
  });

  const permissionRows = await prisma.permission.findMany({
    where: { key: { in: [...TENANT_DOC_PERMISSION_KEYS] } },
    select: { key: true, module: true },
    orderBy: { key: "asc" },
  });

  const samplePages = await tableExists("TenantDocumentationPage")
    ? await prisma.$queryRaw<Array<{ id: string; title: string; slug: string }>>`
        SELECT id, title, slug
        FROM "TenantDocumentationPage"
        ORDER BY "createdAt" ASC
        LIMIT 3
      `
    : [];

  const pendingMigrations = migrationReport.filter((m) => !m.applied).map((m) => m.name);
  const repoCompatible =
    migrationReport.every((m) => !m.applied || m.checksumMatch) &&
    pendingMigrations.length <= SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER.length;

  console.log(
    JSON.stringify(
      {
        previewDatabaseNote: KNOWN_PREVIEW_NOTE,
        databaseIdentity: {
          hostFragmentMatch: Boolean(host?.includes(EXPECTED_HOST_FRAGMENT)),
          fingerprint: getDatabaseFingerprintFromEffectivePrismaSource(process.env),
          designatedStageFingerprint: STAGE_CANONICAL_DATABASE_FINGERPRINT,
        },
        migrationOrder: [...SCE_TENANT_DOCUMENTATION_MIGRATION_ORDER],
        migrationReport,
        schemaInventory: {
          tenantDocumentationSpace: await tableExists("TenantDocumentationSpace"),
          tenantDocumentationPage: await tableExists("TenantDocumentationPage"),
          tenantDocumentationPageDraft: await tableExists("TenantDocumentationPageDraft"),
          tenantDocumentationPageVersion: await tableExists("TenantDocumentationPageVersion"),
          tenantDocumentationCollaborationPresence: await tableExists(
            "TenantDocumentationCollaborationPresence",
          ),
        },
        permissionCatalog: {
          expectedKeys: [...TENANT_DOC_PERMISSION_KEYS],
          presentKeys: permissionRows.map((r) => r.key),
          catalogReady: permissionRows.length === TENANT_DOC_PERMISSION_KEYS.length,
        },
        sampleStagePages: samplePages,
        poApprovalScope: {
          schemaDeploy: pendingMigrations,
          permissionSyncDryRun: `npx tsx scripts/sync-tenant-documentation-permissions.ts (APPLY_PERMISSION_SYNC unset)`,
          permissionSyncApply: `APPLY_PERMISSION_SYNC=true npx tsx scripts/sync-tenant-documentation-permissions.ts`,
          permissionSyncOperationId: SCE_TENANT_DOCUMENTATION_PERMISSION_SYNC_OPERATION,
          separateApprovalsRequired: [
            "Postgres migrate deploy on STAGE",
            "Permission sync with APPLY_PERMISSION_SYNC=true",
            "PO UAT on STAGE (two-user checklist)",
          ],
        },
        appCompatibilityAtCandidateSha: repoCompatible,
        pendingMigrations,
        readOnly: true,
      },
      null,
      2,
    ),
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