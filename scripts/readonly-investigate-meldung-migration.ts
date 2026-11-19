/**
 * Read-only incident inspection — stdout is safe (no credentials).
 * Usage: npx tsx scripts/readonly-investigate-meldung-migration.ts
 */
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { getDatabaseFingerprintFromUrl } from "@/lib/server/deployment-identity";
import { maskDatabaseUrl } from "@/lib/test/safe-test-database";

loadEnvConfig(process.cwd());

const STAGE_FP = "acd3b37682911890";
const MIGRATION = "20261120120000_sce_anliegen_01_foundation";

async function inspect(label: string, url: string | undefined) {
  if (!url?.trim()) return;
  const pool = new Pool({ connectionString: url.trim(), max: 1 });
  try {
    const fp = getDatabaseFingerprintFromUrl(url);
    const [{ exists }] = (
      await pool.query(`SELECT to_regclass('"ClubMeldung"') IS NOT NULL AS exists`)
    ).rows as { exists: boolean }[];

    const targetMigration = (
      await pool.query(
        `SELECT migration_name, started_at, finished_at, applied_steps_count, rolled_back_at,
                left(coalesce(logs, ''), 200) AS logs_preview
         FROM "_prisma_migrations"
         WHERE migration_name = $1`,
        [MIGRATION],
      )
    ).rows;

    const incomplete = (
      await pool.query(
        `SELECT migration_name, started_at, finished_at, left(coalesce(logs, ''), 120) AS logs_preview
         FROM "_prisma_migrations"
         WHERE finished_at IS NULL
         ORDER BY started_at DESC
         LIMIT 10`,
      )
    ).rows;

    const meldungPerms = (
      await pool.query(
        `SELECT key, module FROM "Permission" WHERE key LIKE 'meldungen.%' ORDER BY key`,
      )
    ).rows as { key: string; module: string }[];

    const roleGrantCount = (
      await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM "RolePermission" rp
         JOIN "Permission" p ON p.id = rp."permissionId"
         WHERE p.key LIKE 'meldungen.%'`,
      )
    ).rows[0] as { n: number };

    console.log(
      JSON.stringify(
        {
          label,
          maskedUrl: maskDatabaseUrl(url),
          fingerprint: fp,
          matchesStagePoolerFingerprint: fp?.toLowerCase() === STAGE_FP,
          clubMeldungTableExists: exists,
          foundationMigration: targetMigration,
          incompleteMigrations: incomplete,
          meldungenPermissionCatalogCount: meldungPerms.length,
          meldungenPermissionKeys: meldungPerms.map((p) => p.key),
          meldungenRolePermissionGrants: roleGrantCount.n,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

async function main() {
  await inspect("pooler (DATABASE_URL)", process.env.DATABASE_URL);
  await inspect("direct (DIRECT_URL)", process.env.DIRECT_URL);
}

main().catch((error) => {
  console.error("[readonly-investigate-meldung-migration]", error instanceof Error ? error.message : error);
  process.exit(1);
});