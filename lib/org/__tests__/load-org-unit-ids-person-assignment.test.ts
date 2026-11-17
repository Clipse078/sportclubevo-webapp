/**
 * Org scope for visibility — ACTIVE PersonAssignment must contribute to actor.orgUnitIds.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  orgUnitMembershipFindMany: vi.fn(),
  personAssignmentFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    orgUnitMembership: {
      findMany: (...args: unknown[]) => prismaMocks.orgUnitMembershipFindMany(...args),
    },
    personAssignment: {
      findMany: (...args: unknown[]) => prismaMocks.personAssignmentFindMany(...args),
    },
  },
}));

import { loadOrgUnitIds } from "@/lib/org/queries";

const TENANT = "tenant-fca";
const USER = "user-patrick";
const VL_ORG = "org-vl";

describe("loadOrgUnitIds — PersonAssignment org scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.orgUnitMembershipFindMany.mockResolvedValue([]);
    prismaMocks.personAssignmentFindMany.mockResolvedValue([{ orgUnitId: VL_ORG }]);
  });

  it("includes Vereinsleitung org unit from ACTIVE PersonAssignment when membership rows are absent", async () => {
    const ids = await loadOrgUnitIds(USER, TENANT);
    expect(ids).toEqual([VL_ORG]);
    expect(prismaMocks.personAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          status: "ACTIVE",
          person: { userId: USER, isActive: true },
        }),
      }),
    );
  });

  it("does not query PersonAssignment without tenant scope", async () => {
    prismaMocks.personAssignmentFindMany.mockResolvedValue([]);
    await loadOrgUnitIds(USER);
    expect(prismaMocks.personAssignmentFindMany).not.toHaveBeenCalled();
  });
});