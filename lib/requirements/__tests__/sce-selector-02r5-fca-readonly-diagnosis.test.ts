/**
 * SCE-SELECTOR-02R5 — read-only FCA STAGE data model diagnosis (no remote writes).
 *
 * Validates how Trainer ∩ Kinderfussball would be resolved from schema/membership tables.
 * Live STAGE counts require DATABASE_URL; this package only documents model seams.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-SELECTOR-02R5 FCA read-only diagnosis", () => {
  it("documents OrgUnit membership via OrgUnitMembership.personId", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/model OrgUnitMembership/);
    expect(schema).toMatch(/orgUnitId\s+String/);
    expect(schema).toMatch(/personId\s+String/);
  });

  it("documents role/function holders via UserRole + Person.userId mapping", () => {
    const resolvers = read("lib/requirements/requirement-audience-resolvers.ts");
    expect(resolvers).toMatch(/userRole\.findMany/);
    expect(resolvers).toMatch(/mapTenantPersonIdsForUsers/);
  });

  it("documents intersection resolution for Trainer AND OrgUnit in composition module", () => {
    const composition = read("lib/requirements/requirement-audience-composition.ts");
    expect(composition).toMatch(/intersectSets/);
    expect(composition).toMatch(/segmentsFromRequirementAudienceComposition/);
  });

  it("Kinderfussball / Trainer labels may exist in FCA seed or org corrections (read-only grep contract)", () => {
    const migrations = read("prisma/migrations/20260812000000_orgunit_key_corrections_fca/migration.sql");
    expect(migrations.length).toBeGreaterThan(0);
  });
});
