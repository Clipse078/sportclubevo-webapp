import { beforeEach, describe, expect, it, vi } from "vitest";
import { discoverSceSelectorItems } from "@/lib/sce/list-selector/discover-selector-items";

vi.mock("@/lib/sce/list-selector/sources/org-unit-selector-source", () => ({
  browseOrgUnitSelectorItems: vi.fn(async () => ({
    items: [{ id: "ou1", type: "ORG_UNIT", label: "Vereinsleitung" }],
    hasMore: false,
    nextCursor: null,
  })),
  searchOrgUnitSelectorItems: vi.fn(async () => ({ items: [], hasMore: false, nextCursor: null })),
}));

vi.mock("@/lib/sce/list-selector/sources/team-selector-source", () => ({
  browseTeamSelectorItems: vi.fn(async () => ({
    items: [{ id: "t1", type: "TEAM", label: "F2 Junioren" }],
    hasMore: false,
    nextCursor: null,
  })),
  searchTeamSelectorItems: vi.fn(async () => ({ items: [], hasMore: false, nextCursor: null })),
}));

vi.mock("@/lib/sce/list-selector/sources/role-selector-source", () => ({
  browseRoleSelectorItems: vi.fn(async () => ({
    items: [{ id: "r1", type: "ROLE", label: "Trainer" }],
    hasMore: false,
    nextCursor: null,
  })),
  searchRoleSelectorItems: vi.fn(async () => ({ items: [], hasMore: false, nextCursor: null })),
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

  it("throws when every enabled source fails so the orchestrator cannot hang", async () => {
    const { browseOrgUnitSelectorItems } = await import(
      "@/lib/sce/list-selector/sources/org-unit-selector-source"
    );
    vi.mocked(browseOrgUnitSelectorItems).mockRejectedValueOnce(new Error("db down"));
    const { browseTeamSelectorItems } = await import("@/lib/sce/list-selector/sources/team-selector-source");
    vi.mocked(browseTeamSelectorItems).mockRejectedValueOnce(new Error("db down"));
    const { browseRoleSelectorItems } = await import("@/lib/sce/list-selector/sources/role-selector-source");
    vi.mocked(browseRoleSelectorItems).mockRejectedValueOnce(new Error("db down"));

    await expect(
      discoverSceSelectorItems({
        tenantId: "tenant1",
        actorUserId: "user1",
        enabledTypes: ["ORG_UNIT", "TEAM", "ROLE"],
        category: "all",
        query: "",
        communicationContext: "ORGANISATION",
      }),
    ).rejects.toThrow("SCE_SELECTOR_ALL_SOURCES_FAILED");
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
