/**
 * SCE-COMM-RELEASE-01 — read-only STAGE database diagnosis (no mutations).
 */
import "dotenv/config";
import pg from "pg";

function hostFromDatabaseUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

function fingerprintHost(host: string | null): string | null {
  if (!host) return null;
  return `${host.slice(0, 8)}…${host.slice(-14)}`;
}

function dbNameFromUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const stageUrl = process.env.STAGE_DB_URL?.trim();
  if (!stageUrl) {
    throw new Error("STAGE_DB_URL is required for read-only diagnosis.");
  }

  const dbHost = hostFromDatabaseUrl(stageUrl);
  const database = dbNameFromUrl(stageUrl);

  const client = new pg.Client({ connectionString: stageUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const migrations = await client.query(`
      SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count,
             LEFT(logs, 500) AS logs_preview
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%sce_comm%' OR migration_name LIKE '%comm_%'
      ORDER BY migration_name
    `);

    const comm17 = await client.query(`
      SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count,
             logs
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%comm_17%'
    `);

    const comm16 = await client.query(`
      SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count,
             LEFT(logs, 500) AS logs_preview
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%comm_16%'
    `);

    const evoMigrations = await client.query(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%evo_07%' OR migration_name LIKE '%evo_08%' OR migration_name LIKE '%evo_06%'
      ORDER BY migration_name
    `);

    const failedMigrations = await client.query(`
      SELECT migration_name, finished_at, rolled_back_at, applied_steps_count, LEFT(logs, 800) AS logs_preview
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
      ORDER BY started_at
    `);

    const userPrefExists = await client.query(`
      SELECT to_regclass('"UserCommunicationPreference"') AS regclass
    `);
    const sponsorPrefExists = await client.query(`
      SELECT to_regclass('"SponsorContactCommunicationPreference"') AS regclass
    `);

    const rowCounts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "UserCommunicationPreference") AS user_pref_rows,
        (SELECT COUNT(*)::int FROM "SponsorContactCommunicationPreference") AS sponsor_pref_rows
    `).catch(() => ({ rows: [{ user_pref_rows: null, sponsor_pref_rows: null }] }));

    const enums = await client.query(`
      SELECT t.typname AS enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN (
        'CommunicationPreferenceCategory',
        'CommunicationPreferenceChannel',
        'CommunicationConsentStatus'
      )
      GROUP BY t.typname
      ORDER BY t.typname
    `);

    const indexes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('UserCommunicationPreference', 'SponsorContactCommunicationPreference')
      ORDER BY tablename, indexname
    `);

    const fks = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('UserCommunicationPreference', 'SponsorContactCommunicationPreference')
      ORDER BY tc.table_name, tc.constraint_name
    `);

    const orphans = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "UserCommunicationPreference" u
          WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = u."tenantId")) AS orphan_user_tenant,
        (SELECT COUNT(*)::int FROM "UserCommunicationPreference" u
          WHERE NOT EXISTS (SELECT 1 FROM "User" usr WHERE usr.id = u."userId")) AS orphan_user_user,
        (SELECT COUNT(*)::int FROM "SponsorContactCommunicationPreference" s
          WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = s."tenantId")) AS orphan_sponsor_tenant,
        (SELECT COUNT(*)::int FROM "SponsorContactCommunicationPreference" s
          WHERE NOT EXISTS (SELECT 1 FROM "SponsorContact" sc WHERE sc.id = s."sponsorContactId")) AS orphan_sponsor_contact
    `).catch(() => ({
      rows: [
        {
          orphan_user_tenant: null,
          orphan_user_user: null,
          orphan_sponsor_tenant: null,
          orphan_sponsor_contact: null,
        },
      ],
    }));

    console.log(
      JSON.stringify(
        {
          target: {
            databaseHostFingerprint: fingerprintHost(dbHost),
            databaseName: database,
            branchIdentity: "STAGE (STAGE_DB_URL reference host)",
          },
          failedOrIncompleteMigrations: failedMigrations.rows,
          comm16: comm16.rows,
          comm17: comm17.rows,
          evoMigrations: evoMigrations.rows,
          communicationMigrationCount: migrations.rows.length,
          communicationMigrations: migrations.rows,
          comm17Schema: {
            userTable: userPrefExists.rows[0]?.regclass ?? null,
            sponsorTable: sponsorPrefExists.rows[0]?.regclass ?? null,
            rowCounts: rowCounts.rows[0],
            enums: enums.rows,
            indexes: indexes.rows,
            foreignKeys: fks.rows,
            orphans: orphans.rows[0],
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
