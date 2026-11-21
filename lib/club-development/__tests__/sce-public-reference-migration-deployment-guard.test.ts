/**
 * SCE public reference (#1021) — migration deployment guard metadata.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256,
  SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION,
  SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION,
  SCE_PUBLIC_REFERENCE_MIGRATION_ORDER,
} from "../sce-public-reference-migration-handoff";

function migrationSql(name: string): string {
  return readFileSync(resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`), "utf8");
}

describe("SCE public reference migration deployment guard", () => {
  it("keeps recorded STAGE foundation checksum byte-for-byte", () => {
    const sql = migrationSql(SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION);
    const digest = createHash("sha256").update(sql).digest("hex");
    expect(digest).toBe(SCE_PUBLIC_REFERENCE_FOUNDATION_CHECKSUM_SHA256);
    expect(sql).toContain("TenantScePublicNumberSequence");
    expect(sql).not.toContain("ScePublicNumberLedger");
  });

  it("orders global conversion before BIGINT widen", () => {
    expect(SCE_PUBLIC_REFERENCE_MIGRATION_ORDER).toEqual([
      SCE_PUBLIC_REFERENCE_FOUNDATION_MIGRATION,
      SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION,
      "20261121140000_sce_public_reference_bigint",
    ]);
  });

  it("provides guarded STAGE read-only verifier script", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-public-reference-stage-migration-verify-readonly.ts"),
      "utf8",
    );
    expect(script).toContain("sce-public-reference-migration-handoff");
    expect(script).toContain("readOnly: true");
    expect(script).toContain("SCE_DATA_DATABASE_FINGERPRINT");
  });

  it("backfill CLI uses Prisma adapter and shared backfill service", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-public-reference-backfill.ts"),
      "utf8",
    );
    expect(script).toContain("PrismaPg");
    expect(script).toContain("runScePublicReferenceBackfillCli");
    expect(script).toContain("assertScePublicReferenceBackfillAllowed");
    expect(script).not.toMatch(/new PrismaClient\(\s*\)/);
  });

  it("aborts global conversion on cross-tenant collisions", () => {
    const sql = migrationSql(SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION_MIGRATION);
    expect(sql).toContain("SCE_PUBLIC_REFERENCE_GLOBAL_COLLISION");
    expect(sql).toContain("TenantScePublicNumberSequence");
    expect(sql).toContain("ScePublicNumberLedger");
  });
});