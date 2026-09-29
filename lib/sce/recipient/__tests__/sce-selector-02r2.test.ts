import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { browsePersonSelectorItems } from "@/lib/sce/list-selector/sources/person-selector-source";
import { enrichRequirementAudienceStructuralItems } from "@/lib/sce/list-selector/sources/requirement-audience-expansion-labels";

const eligibleMocks = vi.hoisted(() => ({
  listEligibleTaskAssigneePersons: vi.fn(),
  searchEligibleTaskAssigneePersons: vi.fn(),
}));

vi.mock("@/lib/tasks/eligible-task-assignee-persons", () => ({
  listEligibleTaskAssigneePersons: eligibleMocks.listEligibleTaskAssigneePersons,
  searchEligibleTaskAssigneePersons: eligibleMocks.searchEligibleTaskAssigneePersons,
}));

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

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-SELECTOR-02R2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("task assignment browse includes the authenticated eligible person (no actor self-exclusion)", async () => {
    eligibleMocks.listEligibleTaskAssigneePersons.mockResolvedValue([
      {
        personId: "person-admin",
        userId: "user-admin",
        firstName: "Michael",
        lastName: "Duijster",
        email: "m@example.com",
        displayName: "Michael Duijster",
      },
    ]);

    const page = await browsePersonSelectorItems({
      tenantId: "tenant-a",
      actorUserId: "user-admin",
      authorizationContext: "TASK_ASSIGNMENT",
      limit: 20,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("person-admin");
    expect(page.items[0]?.metadata?.linkedUserId).toBe("user-admin");
  });

  it("requirement structural selector items expose expansion person counts", async () => {
    resolverMocks.resolveTeamAudiencePersonIds.mockResolvedValue(["p1", "p2"]);
    const enriched = await enrichRequirementAudienceStructuralItems("tenant-a", [
      { id: "team-1", type: "TEAM", label: "F2" },
    ]);
    expect(enriched[0]?.description).toBe("2 Personen");
    expect(enriched[0]?.metadata?.expansionPersonCount).toBe(2);
  });

  it("SceRecipientSelector remains thin configuration over SceListSelectorPanel", () => {
    const recipient = read("components/sce/recipient/SceRecipientSelector.tsx");
    expect(recipient).toContain("SceListSelectorPanel");
    expect(recipient).not.toContain("useSceListSelectorQuery");
    expect(recipient).not.toContain("discoverSceSelectorItems");
  });

  it("task picker uses PERSON source only (never USER category)", () => {
    const picker = read("components/admin/aufgaben/TaskPeopleMultiPicker.tsx");
    expect(picker).toContain('sourceTypes={["PERSON"]}');
    expect(picker).not.toContain('"USER"');
  });
});
