import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261023210000_sce_finance_04b_04_projection_line_methodology";

describe("FIN-04B-04 migration deployment guard", () => {
  it("adds per-line methodology without modifying FIN-04B-02 migration", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("methodologyFamily");
    expect(sql).toContain("MIXED");
    const prior = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20261023200000_sce_finance_04b_02_projection_persistence/migration.sql",
      ),
      "utf8",
    );
    expect(prior).toContain("CREATE TABLE \"FinanceProjectionLine\"");
    expect(sql).not.toContain("DROP TABLE");
  });

  it("provides a designated STAGE verify script for FIN-04B-04 migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04b-04-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("methodologyFamily");
    expect(script).toContain("sce-finance-04b-02-stage-migration-verify");
    expect(script).toContain("MIGRATION_04B_02");
    expect(script).toContain("APPLY_DATABASE_MIGRATIONS");
  });

  it("schema declares line-level methodology fields", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    const block = schema.match(/model FinanceProjectionLine \{[\s\S]*?\n\}/)?.[0];
    expect(block).toContain("methodologyFamily");
    expect(block).toContain("dataSufficiency");
    expect(block).toContain("confidence");
  });
});
