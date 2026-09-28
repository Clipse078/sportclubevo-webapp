import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "prisma/migrations");
const PG_IDENTIFIER_LIMIT = 63;

function truncatePgIdentifier(identifier: string): string {
  return Buffer.from(identifier, "utf8").subarray(0, PG_IDENTIFIER_LIMIT).toString("utf8");
}

const COMM_MIGRATION_PREFIXES = [
  "202608211",
  "202608222",
  "202609271",
  "202609272",
  "202609273",
  "202609281",
  "202609282",
];

function isCommunicationMigration(name: string): boolean {
  return COMM_MIGRATION_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function extractExplicitIdentifiers(sql: string): string[] {
  const names: string[] = [];
  const patterns = [
    /CONSTRAINT\s+"([^"]+)"/gi,
    /INDEX\s+"([^"]+)"/gi,
    /FOREIGN KEY\s+"([^"]+)"/gi,
    /ADD CONSTRAINT\s+"([^"]+)"/gi,
    /CREATE UNIQUE INDEX\s+"([^"]+)"/gi,
    /CREATE INDEX\s+"([^"]+)"/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sql)) !== null) {
      names.push(match[1]);
    }
  }
  return names;
}

describe("SCE-COMM-EVO-09 communication migration identifiers", () => {
  it("flags duplicate migration folder timestamps in COMM/EVO chain", () => {
    const commDirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isCommunicationMigration(entry.name))
      .map((entry) => entry.name);

    const byTimestamp = new Map<string, string[]>();
    for (const dir of commDirs) {
      const timestamp = dir.slice(0, 14);
      const list = byTimestamp.get(timestamp) ?? [];
      list.push(dir);
      byTimestamp.set(timestamp, list);
    }

    const duplicates = [...byTimestamp.entries()].filter(([, dirs]) => dirs.length > 1);
    expect(duplicates).toEqual([
      [
        "20260928170000",
        [
          "20260928170000_sce_comm_evo_07_rich_personal_signature",
          "20260928170000_sce_comm_evo_08_multi_sender_identities",
        ],
      ],
    ]);
  });

  it("flags explicit identifiers longer than 63 bytes (COMM-17 sponsor unique is a known case)", () => {
    const commDirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isCommunicationMigration(entry.name))
      .map((entry) => entry.name);

    const tooLong: Array<{ migration: string; identifier: string; bytes: number }> = [];

    for (const dir of commDirs) {
      const sql = readFileSync(join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
      for (const identifier of extractExplicitIdentifiers(sql)) {
        const bytes = Buffer.byteLength(identifier, "utf8");
        if (bytes > PG_IDENTIFIER_LIMIT) {
          tooLong.push({ migration: dir, identifier, bytes });
        }
      }
    }

    expect(tooLong.length).toBeGreaterThan(0);
    expect(
      tooLong.some(
        (row) =>
          row.migration === "20260927310000_sce_comm_17_preferences_consent" &&
          row.identifier ===
            "SponsorContactCommunicationPreference_tenantId_sponsorContactId_category_channel_key",
      ),
    ).toBe(true);
  });

  it("detects COMM-17 sponsor unique vs lookup index truncation collision", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "20260927310000_sce_comm_17_preferences_consent", "migration.sql"),
      "utf8",
    );
    const identifiers = extractExplicitIdentifiers(sql);
    const truncated = new Map<string, string[]>();
    for (const identifier of identifiers) {
      const key = truncatePgIdentifier(identifier);
      const list = truncated.get(key) ?? [];
      list.push(identifier);
      truncated.set(key, list);
    }
    const sponsorIds = [
      ...new Set(
        identifiers.filter((id) =>
          id.startsWith("SponsorContactCommunicationPreference_tenantId_sponsorContactId"),
        ),
      ),
    ];
    expect(sponsorIds).toEqual([
      "SponsorContactCommunicationPreference_tenantId_sponsorContactId_category_channel_key",
      "SponsorContactCommunicationPreference_tenantId_sponsorContactId_idx",
    ]);
    const sponsorTruncatedKeys = new Set(sponsorIds.map((id) => truncatePgIdentifier(id)));
    expect(sponsorTruncatedKeys.size).toBe(1);
  });
});
