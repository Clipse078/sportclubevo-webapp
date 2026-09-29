/**
 * SCE-SELECTOR-03 — saved archived role references survive edit/save round-trips;
 * discovery search excludes archived roles from new picks.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeRequirementAudienceSelection,
  requirementAudienceSelectionFromDto,
} from "../requirement-audience-selection";
import { searchRequirementAudienceRoles } from "../audience-selector-search";

const prismaMock = vi.hoisted(() => ({
  role: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("SCE-SELECTOR-03 saved role reference preservation", () => {
  const archivedRoleId = "role-archived-club-admin";
  const activeRoleId = "role-active-trainer";

  const baseDto = {
    draftAudiencePersonIds: [] as string[],
    draftAudienceTeamIds: [] as string[],
    draftAudienceOrgUnitIds: [] as string[],
    draftAudienceTargetGroupIds: [] as string[],
    draftAudienceComposition: null,
  };

  it("loads existing draft audience including archived role ids", () => {
    const selection = requirementAudienceSelectionFromDto({
      ...baseDto,
      draftAudienceRoleIds: [archivedRoleId, activeRoleId],
    });
    expect(selection.roleIds).toEqual([archivedRoleId, activeRoleId]);
  });

  it("retains archived role id when re-normalizing after unrelated edits", () => {
    const loaded = requirementAudienceSelectionFromDto({
      ...baseDto,
      draftAudienceRoleIds: [archivedRoleId, activeRoleId],
    });
    const resaved = normalizeRequirementAudienceSelection({
      ...loaded,
      personIds: [...loaded.personIds],
    });
    expect(resaved.roleIds).toEqual([archivedRoleId, activeRoleId]);
  });

  it("explicit removal omits archived role id from normalized selection", () => {
    const withoutArchived = normalizeRequirementAudienceSelection({
      personIds: [],
      teamIds: [],
      orgUnitIds: [],
      roleIds: [activeRoleId],
      targetGroupIds: [],
      excludePersonIds: [],
      composition: null,
    });
    expect(withoutArchived.roleIds).toEqual([activeRoleId]);
    expect(withoutArchived.roleIds).not.toContain(archivedRoleId);
  });
});

describe("SCE-SELECTOR-03 requirement audience role search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.role.findMany.mockResolvedValue([]);
  });

  it("searches active tenant roles only", async () => {
    await searchRequirementAudienceRoles("tenant-z", "admin", 5);
    expect(prismaMock.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-z",
          scope: "TENANT",
          isArchived: false,
        }),
      }),
    );
  });
});
