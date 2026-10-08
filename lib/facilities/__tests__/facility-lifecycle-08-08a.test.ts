/**
 * SCE-PLANNER-UX-08-08A — lifecycle guards, duplicates, assignable vs historical queries.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertFacilityResourceCodeAvailable,
  normalizeComparableFacilityName,
  normalizeFacilityResourceCode,
} from "../facility-resource-reference-guard";
import { FACILITY_LIFECYCLE_ERROR_CODES } from "../facility-lifecycle-errors";
import { withRequiredCodes, type FacilityResourceOption } from "../resource-options";

const mocks = vi.hoisted(() => ({
  facilityResourceFindFirst: vi.fn(),
}));

const db = {
  facilityResource: { findFirst: (...args: unknown[]) => mocks.facilityResourceFindFirst(...args) },
  facility: { findMany: vi.fn() },
};

describe("normalizeFacilityResourceCode", () => {
  it("G — normalizes code before duplicate comparison", () => {
    expect(normalizeFacilityResourceCode("  stadion_a  ")).toBe("STADION_A");
    expect(normalizeFacilityResourceCode("HAUPTFELD  A")).toBe("HAUPTFELD A");
  });
});

describe("assertFacilityResourceCodeAvailable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("G — duplicate code in same tenant throws DUPLICATE_RESOURCE", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({ id: "existing" });
    await expect(
      assertFacilityResourceCodeAvailable(db, "t1", "STADION"),
    ).rejects.toMatchObject({ code: FACILITY_LIFECYCLE_ERROR_CODES.DUPLICATE_RESOURCE });
  });

  it("H — duplicate update blocked when code collides", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({ id: "other" });
    await expect(
      assertFacilityResourceCodeAvailable(db, "t1", "E1", "res-self"),
    ).rejects.toMatchObject({ code: FACILITY_LIFECYCLE_ERROR_CODES.DUPLICATE_RESOURCE });

    expect(mocks.facilityResourceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "res-self" } }),
      }),
    );
  });

  it("I — tenant isolation on duplicate check", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue(null);
    await assertFacilityResourceCodeAvailable(db, "tenant-a", "STADION");
    expect(mocks.facilityResourceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-a" }) }),
    );
  });
});

describe("normalizeComparableFacilityName", () => {
  it("treats case/whitespace variants as the same facility identity", () => {
    expect(normalizeComparableFacilityName(" Kunstrasen  2 ")).toBe(
      normalizeComparableFacilityName("kunstrasen 2"),
    );
  });
});

describe("withRequiredCodes — D/E archived historical resolution", () => {
  const ACTIVE: FacilityResourceOption[] = [{ code: "K2", name: "Kunstrasen 2" }];

  it("D — archived pitch code still resolves for existing reference", () => {
    const merged = withRequiredCodes(ACTIVE, ["STADION"], new Map([["STADION", "Hauptplatz (archiviert)"]]));
    expect(merged.some((o) => o.code === "STADION")).toBe(true);
    expect(merged.find((o) => o.code === "STADION")?.name).toContain("archiviert");
  });

  it("E — archived dressing room code still resolves", () => {
    const merged = withRequiredCodes(ACTIVE, ["E9"], new Map([["E9", "Garderobe E9"]]));
    expect(merged.find((o) => o.code === "E9")?.name).toBe("Garderobe E9");
  });
});
