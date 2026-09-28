import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260927310000_sce_comm_17_preferences_consent",
  "migration.sql",
);

describe("SCE-COMM-17 migration recovery SQL", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  it("is idempotent for partial apply and avoids destructive recovery", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS");
    expect(sql).toMatch(/EXCEPTION WHEN duplicate_object THEN NULL/);
    expect(sql).not.toMatch(/\bDROP TABLE\b/i);
    expect(sql).not.toMatch(/\bDROP TYPE\b/i);
  });

  it("renames truncated sponsor unique index when present", () => {
    expect(sql).toContain(
      "SponsorContactCommunicationPreference_tenantId_sponsorContactId",
    );
    expect(sql).toContain('RENAME TO "SponsorCommPref_tenant_sponsor_cat_chan_key"');
  });

  it("adds all four COMM-17 foreign keys with cascade semantics", () => {
    expect(sql).toContain('"UserCommunicationPreference_tenantId_fkey"');
    expect(sql).toContain('"UserCommunicationPreference_userId_fkey"');
    expect(sql).toContain('"SponsorContactCommunicationPreference_tenantId_fkey"');
    expect(sql).toContain(
      '"SponsorContactCommunicationPreference_sponsorContactId_fkey"',
    );
    expect(sql.match(/ON DELETE CASCADE/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
