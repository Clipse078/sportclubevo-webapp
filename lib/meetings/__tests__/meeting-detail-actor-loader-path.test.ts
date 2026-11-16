/**
 * Meeting detail loader — actor hydration + slug resolve chain (SCE-CD-02).
 * Exercises getActorContext → getMeetingBySlug without injecting permissionKeys on ActorContext directly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

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
import { getMeetingBySlug } from "@/lib/meetings/queries";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

const TENANT_A = "tenant-fixture-a";
const TENANT_B = "tenant-fixture-b";
const USER_ID = "user-fixture-1";

const sessionUserWithJwtGrants = {
  id: USER_ID,
  roleKeys: ["board_member"],
  permissionKeys: [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE],
};

const visibleMeetingRow = {
  id: "m-visible",
  slug: "fixture-board-sitzung",
  title: "Fixture Vorstandssitzung",
  visibilityScope: VisibilityScope.ORGANISATION,
  createdByUserId: "other-user",
  visibleRoleRefs: [],
  visibleUserRefs: [],
  visibleTeamRefs: [],
  visibleOrgUnitRefs: [],
  visiblePersonRefs: [],
  visibleTargetGroupRefs: [],
};

function primeActiveMembership() {
  prismaMocks.tenantMembershipFindFirst.mockResolvedValue({ id: "membership-1" });
  prismaMocks.userRoleFindMany.mockResolvedValue([{ role: { key: "board_member" } }]);
  vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
    platform: [],
    tenant: [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE],
  });
}

describe("meeting detail actor → loader path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeActiveMembership();
  });

  it("loads a visible meeting after membership-scoped permission hydration", async () => {
    prismaMocks.meetingFindFirst.mockResolvedValue(visibleMeetingRow);

    const actor = await getActorContext(sessionUserWithJwtGrants, TENANT_A);
    const meeting = await getMeetingBySlug("fixture-board-sitzung", actor);

    expect(actor.permissionKeys).toContain(PERMISSIONS.MEETINGS_VIEW);
    expect(meeting?.slug).toBe("fixture-board-sitzung");
    expect(prismaMocks.meetingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "fixture-board-sitzung", tenantId: TENANT_A },
      }),
    );
  });

  it("returns null for missing slug even when JWT carries meetings.view", async () => {
    prismaMocks.meetingFindFirst.mockResolvedValue(null);

    const actor = await getActorContext(sessionUserWithJwtGrants, TENANT_A);
    const meeting = await getMeetingBySlug("test-sitzung", actor);

    expect(meeting).toBeNull();
  });

  it("strips JWT permissions when membership is revoked — loader fails closed", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);
    prismaMocks.meetingFindFirst.mockResolvedValue(visibleMeetingRow);

    const actor = await getActorContext(sessionUserWithJwtGrants, TENANT_A);
    const meeting = await getMeetingBySlug("fixture-board-sitzung", actor);

    expect(actor.tenantId).toBe(TENANT_A);
    expect(actor.permissionKeys).toEqual([]);
    expect(meeting).toBeNull();
    expect(prismaMocks.meetingFindFirst).not.toHaveBeenCalled();
  });

  it("does not reuse JWT grants for a cross-tenant active tenant", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);
    prismaMocks.meetingFindFirst.mockResolvedValue(visibleMeetingRow);

    const actor = await getActorContext(sessionUserWithJwtGrants, TENANT_B);
    const meeting = await getMeetingBySlug("fixture-board-sitzung", actor);

    expect(actor.tenantId).toBe(TENANT_B);
    expect(actor.permissionKeys).toEqual([]);
    expect(meeting).toBeNull();
    expect(prismaMocks.meetingFindFirst).not.toHaveBeenCalled();
  });

  it("404-masks RESTRICTED meetings the hydrated actor cannot see", async () => {
    prismaMocks.meetingFindFirst.mockResolvedValue({
      ...visibleMeetingRow,
      id: "m-hidden",
      slug: "fixture-restricted",
      visibilityScope: VisibilityScope.RESTRICTED,
      createdByUserId: "other-user",
      visibleOrgUnitRefs: ["org-not-held"],
    });

    const actor = await getActorContext(sessionUserWithJwtGrants, TENANT_A);
    const meeting = await getMeetingBySlug("fixture-restricted", actor);

    expect(actor.permissionKeys).toContain(PERMISSIONS.MEETINGS_VIEW);
    expect(meeting).toBeNull();
  });
});