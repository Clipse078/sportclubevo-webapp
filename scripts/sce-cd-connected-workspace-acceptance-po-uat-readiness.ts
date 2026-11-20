/**
 * PR #1017 — read-only Acceptance PO UAT readiness (schema + fixture inventory).
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { ACCEPTANCE_DATABASE_NAME } from "@/lib/acceptance/bootstrap";
import {
  SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID,
  SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG,
  SCE_CD_CONNECTED_PO_UAT_TARGET_ID,
} from "@/lib/acceptance/sce-cd-connected-workspace-po-uat-ledger";
import {
  buildConnectedWorkspacePoUatHandoffUrls,
  CONNECTED_WORKSPACE_PO_UAT_HANDOFF,
} from "@/lib/club-development/sce-cd-connected-workspace-po-uat-handoff";

function fingerprintDatabaseUrl(url: string): string {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  return createHash("sha256")
    .update(`${parsed.hostname.toLowerCase()}:${database}`)
    .digest("hex")
    .slice(0, 16);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const identity = await prisma.$queryRawUnsafe<Array<{ database_name: string }>>(
      "SELECT current_database() AS database_name",
    );
    const databaseName = identity[0]?.database_name ?? "";
    const fp = fingerprintDatabaseUrl(databaseUrl);

    const scopeType = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ClubStrategy'
          AND column_name = 'scopeType'
      ) AS exists
    `;

    const pending = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE migration_name = '20261120120000_sce_cd_connected_workspace'
    `;

    const schemaReady = scopeType[0]?.exists === true;
    const migrationRecorded = pending.length > 0;

    let strategy: { id: string } | null = null;
    let target: { id: string } | null = null;
    let sprint: { id: string; slug: string } | null = null;
    let focus = false;

    if (schemaReady) {
      const rows = await prisma.$queryRaw<
        Array<{ strategy_id: string | null; target_id: string | null; sprint_id: string | null; focus_id: string | null }>
      >`
        SELECT
          (SELECT id FROM "ClubStrategy" WHERE id = ${SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID} LIMIT 1) AS strategy_id,
          (SELECT id FROM "Target" WHERE id = ${SCE_CD_CONNECTED_PO_UAT_TARGET_ID} LIMIT 1) AS target_id,
          (SELECT id FROM "DevelopmentSprint" WHERE slug = ${SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG} LIMIT 1) AS sprint_id,
          (SELECT id FROM "ClubStrategyFocusTarget"
            WHERE "clubStrategyId" = ${SCE_CD_CONNECTED_PO_UAT_CLUB_STRATEGY_ID}
              AND "targetId" = ${SCE_CD_CONNECTED_PO_UAT_TARGET_ID}
            LIMIT 1) AS focus_id
      `;
      const row = rows[0];
      strategy = row?.strategy_id ? { id: row.strategy_id } : null;
      target = row?.target_id ? { id: row.target_id } : null;
      sprint =
        row?.sprint_id != null
          ? { id: row.sprint_id, slug: SCE_CD_CONNECTED_PO_UAT_SPRINT_SLUG }
          : null;
      focus = Boolean(row?.focus_id);
    }

    const fixturesReady = Boolean(strategy && target && sprint && focus);

    const previewBase = CONNECTED_WORKSPACE_PO_UAT_HANDOFF.readyPreviewOrigin;

    console.log(
      JSON.stringify(
        {
          database: { name: databaseName, fingerprint: fp, isAcceptance: databaseName === ACCEPTANCE_DATABASE_NAME },
          connectedWorkspaceMigration: {
            schemaReady,
            migrationRecorded,
            pendingOnDb: !migrationRecorded,
          },
          fixtures: {
            ready: fixturesReady,
            clubStrategyId: strategy?.id ?? null,
            targetId: target?.id ?? null,
            sprintSlug: sprint?.slug ?? null,
            sprintId: sprint?.id ?? null,
            focusLink: Boolean(focus),
          },
          poUrls: buildConnectedWorkspacePoUatHandoffUrls(previewBase),
          operatorBlocker:
            databaseName !== ACCEPTANCE_DATABASE_NAME
              ? "DATABASE_URL is not sce_acceptance — use Acceptance credentials only."
              : !schemaReady
                ? "Apply 20261120120000_sce_cd_connected_workspace on sce_acceptance before PO UAT."
                : !fixturesReady
                  ? "Run scripts/sce-cd-connected-workspace-acceptance-seed.ts after bootstrap."
                  : null,
        },
        null,
        2,
      ),
    );

    if (databaseName !== ACCEPTANCE_DATABASE_NAME || !schemaReady || !fixturesReady) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    "[sce-cd-connected-workspace-acceptance-po-uat-readiness] FAILED:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});