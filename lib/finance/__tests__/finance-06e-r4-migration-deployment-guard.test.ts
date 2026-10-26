/**
 * FIN-06E-R4 — build/deploy guardrails for Prisma generated enum parity.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("FIN-06E-R4 migration deployment guard", () => {
  it("runs prisma generate after install on Vercel (cached node_modules safe)", () => {
    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      installCommand?: string;
      buildCommand?: string;
    };
    expect(vercel.installCommand).toContain("prisma generate");
    expect(vercel.buildCommand).toContain("npm run build");
  });

  it("build script generates Prisma client before deployment preflight", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const build = pkg.scripts.build ?? "";
    expect(build.indexOf("prisma generate")).toBeLessThan(build.indexOf("deployment:preflight"));
  });

  it("deployment preflight checks generated enum parity", () => {
    const preflight = readFileSync(
      resolve(process.cwd(), "lib/server/deployment-preflight.ts"),
      "utf8",
    );
    expect(preflight).toContain("collectPrismaGeneratedEnumParityViolations");
  });

  it("06E migration adds DISTRIBUTION to FinancePublicationShareKind", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20261026160000_sce_finance_06e_publication_distribution/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain(`ADD VALUE 'DISTRIBUTION'`);
  });

  it("documents PostgreSQL enum guard SQL for deployed DISTRIBUTION shares", () => {
    const contract = readFileSync(
      resolve(process.cwd(), "lib/server/finance-publication-share-database-contract.ts"),
      "utf8",
    );
    expect(contract).toContain("FinancePublicationShareKind");
    expect(contract).toContain("DISTRIBUTION");
  });
});
