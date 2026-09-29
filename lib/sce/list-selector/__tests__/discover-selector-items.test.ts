import { beforeEach, describe, expect, it, vi } from "vitest";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";

vi.mock("@/lib/sce/list-selector/sources/org-unit-selector-source", () => ({
  browseOrgUnitSelectorItems: vi.fn(async () => [
    { id: "ou1", type: "ORG_UNIT", label: "Vereinsleitung" },
  ]),
  searchOrgUnitSelectorItems: vi.fn(async () => []),
}));

vi.mock("@/lib/sce/list-selector/sources/team-selector-source", () => ({
  browseTeamSelectorItems: vi.fn(async () => [
    { id: "t1", type: "TEAM", label: "F2 Junioren" },
  ]),
  searchTeamSelectorItems: vi.fn(async () => []),
}));

vi.mock("@/lib/sce/list-selector/sources/role-selector-source", () => ({
  browseRoleSelectorItems: vi.fn(async () => [{ id: "r1", type: "ROLE", label: "Trainer" }]),
  searchRoleSelectorItems: vi.fn(async () => []),
}));

vi.mock("@/lib/sce/list-selector/sources/person-selector-source", () => ({
  browsePersonSelectorItems: vi.fn(async () => []),
  searchPersonSelectorItems: vi.fn(async () => []),
}));

vi.mock("@/lib/sce/list-selector/sources/external-contact-selector-source", () => ({
  browseExternalContactSelectorItems: vi.fn(async () => []),
  searchExternalContactSelectorItems: vi.fn(async () => []),
}));

vi.mock("@/lib/sce/list-selector/sources/target-group-selector-source", () => ({
  browseTargetGroupSelectorItems: vi.fn(async () => []),
  searchTargetGroupSelectorItems: vi.fn(async () => []),
}));

describe("discoverSceSelectorItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns browse groups for empty query without requiring search term", async () => {
    const groups = await discoverSceSelectorItems({
      tenantId: "tenant1",
      actorUserId: "user1",
      enabledTypes: ["ORG_UNIT", "TEAM", "ROLE"],
      category: "all",
      query: "",
      communicationContext: "ORGANISATION",
    });

    expect(groups.length).toBeGreaterThanOrEqual(3);
    expect(groups.some((g) => g.type === "ORG_UNIT")).toBe(true);
    expect(groups.some((g) => g.type === "TEAM")).toBe(true);
    expect(groups.some((g) => g.type === "ROLE")).toBe(true);
  });
});
