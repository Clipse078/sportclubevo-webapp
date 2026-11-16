import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindFirst: vi.fn(),
  userRoleFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: {
      findFirst: (...args: unknown[]) => prismaMocks.tenantMembershipFindFirst(...args),
    },
    userRole: {
      findMany: (...args: unknown[]) => prismaMocks.userRoleFindMany(...args),
    },
  },
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/incident/sce-hotfix-login-01-trace", () => ({
  logSceHotfixLogin01Step: vi.fn(),
  logSceHotfixLogin01StepDone: vi.fn(),
  logSceHotfixLogin01StepFailed: vi.fn(),
  recordSceHotfixLogin01DuplicateProbe: vi.fn(),
  sceHotfixLogin01TraceEnabled: vi.fn(() => false),
}));

import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

const sessionUser = {
  id: "user-fixture-1",
  roleKeys: ["board_member"],
  permissionKeys: [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE],
};

const TENANT_A = "tenant-fixture-a";
const TENANT_B = "tenant-fixture-b";

describe("getActorContext membership hydration (dcd9200d)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue({ id: "membership-1" });
    prismaMocks.userRoleFindMany.mockResolvedValue([
      { role: { key: "board_member" } },
    ]);
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE],
    });
  });

  it("omits tenantId when tenant scope is not provided", async () => {
    const actor = await getActorContext(sessionUser);
    expect(actor.tenantId).toBeUndefined();
    expect(actor.permissionKeys).toEqual(sessionUser.permissionKeys);
    expect(prismaMocks.tenantMembershipFindFirst).not.toHaveBeenCalled();
  });

  it("strips roles and permissions but retains tenantId when membership is missing", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);

    const actor = await getActorContext(sessionUser, TENANT_A);

    expect(actor.tenantId).toBe(TENANT_A);
    expect(actor.roleKeys).toEqual([]);
    expect(actor.permissionKeys).toEqual([]);
    expect(actor.orgUnitIds).toEqual([]);
    expect(actor.targetGroupIds).toEqual([]);
    expect(getRequestEffectivePermissions).not.toHaveBeenCalled();
    expect(prismaMocks.userRoleFindMany).not.toHaveBeenCalled();
  });

  it("strips roles and permissions but retains tenantId when membership lookup throws", async () => {
    prismaMocks.tenantMembershipFindFirst.mockRejectedValue(
      new Error("tenantMembership unavailable"),
    );

    const actor = await getActorContext(sessionUser, TENANT_A);

    expect(actor.tenantId).toBe(TENANT_A);
    expect(actor.roleKeys).toEqual([]);
    expect(actor.permissionKeys).toEqual([]);
    expect(getRequestEffectivePermissions).not.toHaveBeenCalled();
  });

  it("strips roles and permissions but retains tenantId when permission hydration throws", async () => {
    vi.mocked(getRequestEffectivePermissions).mockRejectedValue(
      new Error("permission resolver outage"),
    );

    const actor = await getActorContext(sessionUser, TENANT_A);

    expect(actor.tenantId).toBe(TENANT_A);
    expect(actor.roleKeys).toEqual([]);
    expect(actor.permissionKeys).toEqual([]);
  });

  it("does not grant cross-tenant session permissions when active tenant has no membership", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);

    const actor = await getActorContext(sessionUser, TENANT_B);

    expect(actor.tenantId).toBe(TENANT_B);
    expect(actor.permissionKeys).toEqual([]);
    expect(prismaMocks.tenantMembershipFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_B, userId: sessionUser.id }),
      }),
    );
  });

  it("loads tenant-scoped permissions only after active membership is confirmed", async () => {
    const actor = await getActorContext(sessionUser, TENANT_A);

    expect(actor.tenantId).toBe(TENANT_A);
    expect(actor.permissionKeys).toContain(PERMISSIONS.MEETINGS_VIEW);
    expect(actor.roleKeys).toContain("board_member");
  });
});