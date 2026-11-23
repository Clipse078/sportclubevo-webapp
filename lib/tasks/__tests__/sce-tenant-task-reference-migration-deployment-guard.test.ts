/**
 * SCE tenant task references (#1028) — migration deployment guard metadata.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SCE_TENANT_PUBLIC_REFERENCE_DISPOSABLE_VERIFY_SCRIPT,
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
  SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER,
  SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION,
  SCE_TENANT_RECORD_REFERENCE_COLUMNS_STAGE_VERIFY_SCRIPT,
} from "@/lib/tenant-public-reference/sce-tenant-public-reference-migration-handoff";

describe("SCE tenant task reference migration deployment guard", () => {
  it("orders the tenant reference migrations", () => {
    expect(SCE_TENANT_PUBLIC_REFERENCES_MIGRATION_ORDER).toEqual([
      SCE_TENANT_PUBLIC_REFERENCES_MIGRATION,
      SCE_TENANT_RECORD_REFERENCE_COLUMNS_MIGRATION,
    ]);
  });

  it("requires migration before app paths that allocate tenant numbers", () => {
    const handoff = readFileSync(
      resolve(
        process.cwd(),
        "lib/tenant-public-reference/sce-tenant-public-reference-migration-handoff.ts",
      ),
      "utf8",
    );
    expect(handoff).toContain("migrate before deploy");
    expect(handoff).toContain("backfill");
  });

  it("provides guarded disposable migration verifier with PrismaPg adapter", () => {
    const script = readFileSync(
      resolve(process.cwd(), SCE_TENANT_PUBLIC_REFERENCE_DISPOSABLE_VERIFY_SCRIPT),
      "utf8",
    );
    expect(script).toContain("buildDisposablePrismaMigrateProcessEnv");
    expect(script).toContain("PrismaPg");
    expect(script).toContain("sce-tenant-public-reference-migration-handoff");
  });

  it("provides designated STAGE verifier for record reference columns migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), SCE_TENANT_RECORD_REFERENCE_COLUMNS_STAGE_VERIFY_SCRIPT),
      "utf8",
    );
    expect(script).toContain("sce-tenant-public-reference-migration-handoff");
    expect(script).toContain("post-deploy-tenant-club-admin-reconciliation");
    expect(script).toContain("db:migrate:deploy-if-enabled");
  });
});