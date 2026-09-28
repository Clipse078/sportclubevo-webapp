import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const POSTGRES_MAX_IDENTIFIER = 63;

describe("SCE-COMM-INBOX-01 PostgreSQL identifier safety", () => {
  it("uses explicit short index names under 63 bytes", () => {
    const migrationPath = join(
      process.cwd(),
      "prisma/migrations/20260928120000_sce_comm_inbox_01_mailbox_organization/migration.sql",
    );
    const sql = readFileSync(migrationPath, "utf8");
    const indexNames = [...sql.matchAll(/CREATE INDEX "([^"]+)"/g)].map((match) => match[1]);
    expect(indexNames.length).toBeGreaterThan(0);
    for (const name of indexNames) {
      expect(name.length).toBeLessThanOrEqual(POSTGRES_MAX_IDENTIFIER);
    }
    expect(new Set(indexNames).size).toBe(indexNames.length);
  });
});
