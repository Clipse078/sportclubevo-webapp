/**
 * SCE-SELECTOR-03 — archived tenant roles excluded from discovery, not from hydration paths.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  role: { findMany: vi.fn() },
  orgUnit: { findMany: vi.fn() },
  team: { findMany: vi.fn() },
  targetGroup: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/sce/list-selector/sources/requirement-audience-expansion-labels", () => ({
  enrichRequirementAudienceStructuralItems: vi.fn(async (_tenantId: string, items: unknown[]) => items),
}));

import {
  browseRoleSelectorItems,
  searchRoleSelectorItems,
} from "@/lib/sce/list-selector/sources/role-selector-source";
import { browseWorkspaceRoleFunctionSelectorItems } from "@/lib/sce/list-selector/sources/workspace-role-function-selector-source";
import { loadRequirementAudienceLabels } from "@/lib/requirements/audience-selector-search";
import { loadCommunicationAudienceLabels } from "@/lib/communication/audience/communication-audience-search-service";

describe("role selector discovery (SCE-SELECTOR-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.role.findMany.mockResolvedValue([]);
    prismaMock.orgUnit.findMany.mockResolvedValue([]);
    prismaMock.team.findMany.mockResolvedValue([]);
    prismaMock.targetGroup.findMany.mockResolvedValue([]);
    prismaMock.person.findMany.mockResolvedValue([]);
  });

  it("browse queries active tenant roles only for the requested tenant", async () => {
    prismaMock.role.findMany.mockResolvedValue([
      { id: "role-active", name: "Trainer", key: "trainer" },
    ]);

    await browseRoleSelectorItems({ tenantId: "tenant-a", limit: 10 });

    expect(prismaMock.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a", scope: "TENANT", isArchived: false },
      }),
    );
  });

  it("search queries active tenant roles only and supports pagination window", async () => {
    prismaMock.role.findMany.mockResolvedValue([
      { id: "role-active", name: "Club Admin", key: "club_admin" },
    ]);

    await searchRoleSelectorItems({
      tenantId: "tenant-b",
      query: "club",
      limit: 2,
      cursor: "4",
    });

    expect(prismaMock.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "tenant-b",
          scope: "TENANT",
          isArchived: false,
          name: { contains: "club", mode: "insensitive" },
        },
        skip: 4,
        take: 3,
      }),
    );
  });

  it("browse excludes archived rows before pagination (hasMore from active set only)", async () => {
    const activeRows = Array.from({ length: 3 }, (_, i) => ({
      id: `active-${i}`,
      name: `Role ${i}`,
      key: `role_${i}`,
    }));
    prismaMock.role.findMany.mockResolvedValue(activeRows);

    const page = await browseRoleSelectorItems({ tenantId: "tenant-a", limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("2");
  });

  it("WORKSPACE_ACCESS role/function source is unchanged (not tenant Role records)", async () => {
    const page = await browseWorkspaceRoleFunctionSelectorItems({ limit: 5 });
    expect(prismaMock.role.findMany).not.toHaveBeenCalled();
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((item) => item.metadata?.workspaceRoleFunction === true)).toBe(true);
  });
});

describe("saved audience role hydration (SCE-SELECTOR-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.orgUnit.findMany.mockResolvedValue([]);
    prismaMock.team.findMany.mockResolvedValue([]);
    prismaMock.targetGroup.findMany.mockResolvedValue([]);
    prismaMock.person.findMany.mockResolvedValue([]);
  });

  it("loadRequirementAudienceLabels retains archived roles with status suffix", async () => {
    prismaMock.role.findMany.mockResolvedValue([
      { id: "archived-role", name: "Club Admin", isArchived: true },
    ]);

    const labels = await loadRequirementAudienceLabels({
      tenantId: "tenant-a",
      teamIds: [],
      orgUnitIds: [],
      roleIds: ["archived-role"],
      targetGroupIds: [],
    });

    expect(labels.roles).toEqual([{ roleId: "archived-role", label: "Club Admin (Archiviert)" }]);
    expect(prismaMock.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a", id: { in: ["archived-role"] }, scope: "TENANT" },
        select: { id: true, name: true, isArchived: true },
      }),
    );
    const roleWhere = prismaMock.role.findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(roleWhere.isArchived).toBeUndefined();
  });

  it("loadCommunicationAudienceLabels retains archived roles with status suffix", async () => {
    prismaMock.role.findMany.mockResolvedValue([
      { id: "archived-role", name: "Legacy Admin", isArchived: true },
    ]);

    const labels = await loadCommunicationAudienceLabels({
      tenantId: "tenant-a",
      orgUnitIds: [],
      teamIds: [],
      roleIds: ["archived-role"],
      targetGroupIds: [],
      personIds: [],
    });

    expect(labels.roles).toEqual({ "archived-role": "Legacy Admin (Archiviert)" });
  });
});
