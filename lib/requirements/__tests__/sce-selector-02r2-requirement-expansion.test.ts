import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveRequirementAudiencePersonIdsFromDraftRows } from "@/lib/requirements/requirement-audience";
import { resolveRequirementAudiencePersonIdsFromSnapshot } from "@/lib/requirements/requirement-audience";

const resolverMocks = vi.hoisted(() => ({
  resolveTeamAudiencePersonIds: vi.fn(),
  resolveOrgUnitAudiencePersonIds: vi.fn(),
  resolveRoleAudiencePersonIds: vi.fn(),
  resolveTargetGroupAudiencePersonIds: vi.fn(),
}));

vi.mock("@/lib/requirements/requirement-audience-resolvers", () => ({
  resolveTeamAudiencePersonIds: resolverMocks.resolveTeamAudiencePersonIds,
  resolveOrgUnitAudiencePersonIds: resolverMocks.resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds: resolverMocks.resolveRoleAudiencePersonIds,
  resolveTargetGroupAudiencePersonIds: resolverMocks.resolveTargetGroupAudiencePersonIds,
  mapTenantPersonIdsForUsers: vi.fn(),
}));

describe("SCE-SELECTOR-02R2 requirement expansion semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("direct person rows dedupe to one recipient id", () => {
    expect(
      resolveRequirementAudiencePersonIdsFromDraftRows([
        { personId: "p1" },
        { personId: "p1" },
      ]),
    ).toEqual(["p1"]);
  });

  it("mixed structural targets dedupe by person identity", async () => {
    resolverMocks.resolveTeamAudiencePersonIds.mockResolvedValue(["p1", "p2"]);
    resolverMocks.resolveOrgUnitAudiencePersonIds.mockResolvedValue(["p2", "p3"]);
    resolverMocks.resolveRoleAudiencePersonIds.mockResolvedValue([]);
    resolverMocks.resolveTargetGroupAudiencePersonIds.mockResolvedValue([]);

    const ids = await resolveRequirementAudiencePersonIdsFromSnapshot("tenant-a", {
      persons: [{ personId: "p1" }],
      teams: [{ teamId: "team-1" }],
      orgUnits: [{ orgUnitId: "ou-1" }],
      roles: [],
      targetGroups: [],
    });

    expect(ids.sort()).toEqual(["p1", "p2", "p3"].sort());
  });
});
