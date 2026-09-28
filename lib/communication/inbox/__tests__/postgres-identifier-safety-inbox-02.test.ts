import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const POSTGRES_MAX_IDENTIFIER = 63;

describe("SCE-COMM-INBOX-02 PostgreSQL identifier safety", () => {
  it("uses explicit short index and constraint names under 63 bytes", () => {
    const migrationPath = join(
      process.cwd(),
      "prisma/migrations/20260928140000_sce_comm_inbox_02_workspace_pref/migration.sql",
    );
    const sql = readFileSync(migrationPath, "utf8");
    const names = [
      ...[...sql.matchAll(/CREATE UNIQUE INDEX "([^"]+)"/g)].map((match) => match[1]),
      ...[...sql.matchAll(/CREATE INDEX "([^"]+)"/g)].map((match) => match[1]),
      ...[...sql.matchAll(/ADD CONSTRAINT "([^"]+)"/g)].map((match) => match[1]),
    ];
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(POSTGRES_MAX_IDENTIFIER);
    }
    expect(new Set(names).size).toBe(names.length);
  });
});
