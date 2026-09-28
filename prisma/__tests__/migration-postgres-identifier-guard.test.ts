import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");
const PG_IDENTIFIER_LIMIT = 63;

/** Quoted PostgreSQL identifiers emitted by Prisma migration SQL. */
const QUOTED_IDENTIFIER_PATTERN = /"([A-Za-z0-9_]+)"/g;

function postgresEffectiveName(name: string): string {
  return name.length <= PG_IDENTIFIER_LIMIT ? name : name.slice(0, PG_IDENTIFIER_LIMIT);
}

function collectMigrationSqlFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, "migration.sql"))
    .filter((filePath) => fs.existsSync(filePath));
}

function extractExplicitIndexNames(sql: string): string[] {
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  const indexDefPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+"([A-Za-z0-9_]+)"/gi;
  while ((match = indexDefPattern.exec(sql)) !== null) {
    names.add(match[1]!);
  }
  return [...names];
}

describe("PostgreSQL migration identifier portability", () => {
  it("keeps COMM-17 sponsor preference index names distinct after truncation", () => {
    const comm17 = fs.readFileSync(
      path.join(
        MIGRATIONS_DIR,
        "20260927310000_sce_comm_17_preferences_consent",
        "migration.sql",
      ),
      "utf8",
    );

    expect(comm17).toContain('"SponsorCommPref_tenant_sponsor_cat_chan_key"');
    expect(comm17).toContain('"SponsorCommPref_tenant_sponsor_idx"');
    expect(comm17).not.toContain(
      'CREATE INDEX "SponsorContactCommunicationPreference_tenantId_sponsorContactId_idx"',
    );

    const sponsorUnique = "SponsorCommPref_tenant_sponsor_cat_chan_key";
    const sponsorLookup = "SponsorCommPref_tenant_sponsor_idx";
    expect(postgresEffectiveName(sponsorUnique)).not.toBe(
      postgresEffectiveName(sponsorLookup),
    );
    expect(sponsorUnique.length).toBeLessThanOrEqual(PG_IDENTIFIER_LIMIT);
    expect(sponsorLookup.length).toBeLessThanOrEqual(PG_IDENTIFIER_LIMIT);
  });

  it("does not allow two explicit migration index names to truncate to the same identifier", () => {
    const collisions: Array<{ effective: string; names: string[]; file: string }> = [];
    const byEffective = new Map<string, { names: Set<string>; file: string }>();

    for (const filePath of collectMigrationSqlFiles()) {
      const sql = fs.readFileSync(filePath, "utf8");
      const migrationFolder = path.basename(path.dirname(filePath));
      for (const name of extractExplicitIndexNames(sql)) {
        const effective = postgresEffectiveName(name);
        const key = `${migrationFolder}::${effective}`;
        const bucket = byEffective.get(key) ?? { names: new Set<string>(), file: migrationFolder };
        bucket.names.add(name);
        byEffective.set(key, bucket);
      }
    }

    for (const [key, bucket] of byEffective.entries()) {
      if (bucket.names.size > 1) {
        const [file, effective] = key.split("::");
        collisions.push({ effective: effective!, names: [...bucket.names], file: file! });
      }
    }

    expect(collisions).toEqual([]);
  });

  it("flags historical COMM-17 default sponsor index names as a truncation collision", () => {
    const legacyUnique =
      "SponsorContactCommunicationPreference_tenantId_sponsorContactId_category_channel_key";
    const legacyLookup =
      "SponsorContactCommunicationPreference_tenantId_sponsorContactId_idx";

    expect(postgresEffectiveName(legacyUnique)).toBe(
      postgresEffectiveName(legacyLookup),
    );
    expect(legacyUnique.length).toBeGreaterThan(PG_IDENTIFIER_LIMIT);
    expect(legacyLookup.length).toBeGreaterThan(PG_IDENTIFIER_LIMIT);
  });
});
