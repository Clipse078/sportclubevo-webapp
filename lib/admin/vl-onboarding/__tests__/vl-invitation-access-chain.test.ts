/**
 * Post-invitation VL access: membership → contributor role (DB) → org scope → meeting allowlist.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { canSeeEntity } from "@/lib/visibility/visibility-filter";

const TENANT_ID = "tenant-fca";
const ORG_UNIT_ID = "org-vl";
const VL_ROLE_KEY = FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey;

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindFirst: vi.fn(),
  userRoleFindMany: vi.fn(),
  meetingFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: {
      findFirst: (...args: unknown[]) => prismaMocks.tenantMembershipFindFirst(...args),
    },
    userRole: {
      findMany: (...args: unknown[]) => prismaMocks.userRoleFindMany(...args),
    },
    meeting: {
      findFirst: (...args: unknown[]) => prismaMocks.meetingFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn(),
  loadTargetGroupIds: vi.fn(),
}));

vi.mock("@/lib/incident/sce-hotfix-login-01-trace", () => ({
  logSceHotfixLogin01Step: vi.fn(),
  logSceHotfixLogin01StepDone: vi.fn(),
  logSceHotfixLogin01StepFailed: vi.fn(),
  recordSceHotfixLogin01DuplicateProbe: vi.fn(),
  sceHotfixLogin01TraceEnabled: vi.fn(() => false),
}));

import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getMeetingBySlug } from "@/lib/meetings/queries";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadOrgUnitIds } from "@/lib/org/queries";

const restrictedMeeting = {
  id: "m-vl-restricted",
  slug: "vl-strategie",
  title: "VL Strategie",
  visibilityScope: VisibilityScope.RESTRICTED,
  createdByUserId: "creator-1",
  visibleRoleRefs: [VL_ROLE_KEY],
  visibleUserRefs: [],
  visibleTeamRefs: [],
  visibleOrgUnitRefs: [],
  visiblePersonRefs: [],
  visibleTargetGroupRefs: [],
};

describe("VL invitation access chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue({ id: "mem-active" });
    prismaMocks.userRoleFindMany.mockResolvedValue([{ role: { key: VL_ROLE_KEY } }]);
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [
        PERMISSIONS.MEETINGS_VIEW,
        PERMISSIONS.MEETINGS_MANAGE,
        ...FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys,
      ],
    });
    vi.mocked(loadOrgUnitIds).mockResolvedValue([ORG_UNIT_ID]);
  });

  it("accepted path: active membership + DB role keys unlock RESTRICTED meeting allowlist", async () => {
    prismaMocks.meetingFindFirst.mockResolvedValue(restrictedMeeting);

    const actor = await getActorContext({ id: "user-vl", roleKeys: [], permissionKeys: [] }, TENANT_ID);

    expect(actor.roleKeys).toEqual([VL_ROLE_KEY]);
    expect(actor.orgUnitIds).toContain(ORG_UNIT_ID);
    expect(canSeeEntity(restrictedMeeting, actor)).toBe(true);

    const meeting = await getMeetingBySlug("vl-strategie", actor);
    expect(meeting?.slug).toBe("vl-strategie");
  });

  it("denies org-scoped RESTRICTED meeting when VL org assignment is missing", async () => {
    vi.mocked(loadOrgUnitIds).mockResolvedValue([]);
    const actor = await getActorContext({ id: "user-vl", roleKeys: [], permissionKeys: [] }, TENANT_ID);
    const orgScopedMeeting = {
      ...restrictedMeeting,
      visibleRoleRefs: [],
      visibleOrgUnitRefs: [ORG_UNIT_ID],
    };
    expect(canSeeEntity(orgScopedMeeting, actor)).toBe(false);
  });

  it("denies when contributor role is not hydrated from DB", async () => {
    prismaMocks.userRoleFindMany.mockResolvedValue([]);
    const actor = await getActorContext({ id: "user-vl", roleKeys: [], permissionKeys: [] }, TENANT_ID);
    expect(actor.roleKeys).toEqual([]);
    expect(canSeeEntity(restrictedMeeting, actor)).toBe(false);
  });

  it("fails closed when membership is revoked", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);
    const actor = await getActorContext(
      { id: "user-vl", roleKeys: [VL_ROLE_KEY], permissionKeys: [PERMISSIONS.MEETINGS_VIEW] },
      TENANT_ID,
    );
    expect(actor.permissionKeys).toEqual([]);
    expect(canSeeEntity(restrictedMeeting, actor)).toBe(false);
  });

  it("rejects cross-tenant JWT carry-over", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);
    const actor = await getActorContext(
      {
        id: "user-vl",
        roleKeys: [VL_ROLE_KEY],
        permissionKeys: [PERMISSIONS.MEETINGS_VIEW],
      },
      "tenant-other",
    );
    expect(actor.tenantId).toBe("tenant-other");
    expect(actor.roleKeys).toEqual([]);
    expect(canSeeEntity(restrictedMeeting, actor)).toBe(false);
  });
});