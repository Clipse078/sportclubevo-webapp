/**
 * VL meeting visibility parity — dashboard programme, list, and detail share getActorContext org scope.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const TENANT_ID = "tenant-fca";
const USER_ID = "user-vl";
const PERSON_ID = "person-vl";
const VL_ORG_UNIT_ID = "cmq574tey000004l80y4vqd17";
const CUSTOM_ROLE_KEY = "custom_vorstandsmitglied";

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindFirst: vi.fn(),
  userRoleFindMany: vi.fn(),
  meetingFindMany: vi.fn(),
  meetingFindFirst: vi.fn(),
  orgUnitMembershipFindMany: vi.fn(),
  personAssignmentFindMany: vi.fn(),
  personFindFirst: vi.fn(),
  targetGroupFindMany: vi.fn().mockResolvedValue([]),
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
      findMany: (...args: unknown[]) => prismaMocks.meetingFindMany(...args),
      findFirst: (...args: unknown[]) => prismaMocks.meetingFindFirst(...args),
    },
    orgUnitMembership: {
      findMany: (...args: unknown[]) => prismaMocks.orgUnitMembershipFindMany(...args),
    },
    personAssignment: {
      findMany: (...args: unknown[]) => prismaMocks.personAssignmentFindMany(...args),
    },
    person: {
      findFirst: (...args: unknown[]) => prismaMocks.personFindFirst(...args),
    },
    targetGroup: {
      findMany: (...args: unknown[]) => prismaMocks.targetGroupFindMany(...args),
    },
  },
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/incident/sce-hotfix-login-01-trace", () => ({
  logSceHotfixLogin01Step: vi.fn(),
  logSceHotfixLogin01StepDone: vi.fn(),
  logSceHotfixLogin01StepFailed: vi.fn(),
  recordSceHotfixLogin01DuplicateProbe: vi.fn(),
  sceHotfixLogin01TraceEnabled: vi.fn(() => false),
}));

import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getMeetings, getMeetingBySlug } from "@/lib/meetings/queries";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { canIncludeMeetingInPersonalProgrammeForActor } from "@/lib/personal-agenda/meeting-projection-access";

const vlMeeting = {
  id: "m-nov",
  slug: "vereinsleitungssitzung-november-2026",
  title: "Vereinsleitungssitzung | November 2026",
  description: null,
  meetingDate: new Date("2026-11-01"),
  location: null,
  attendeeCount: null,
  plannedDurationMin: null,
  status: "PLANNED",
  conductedAt: null,
  closedAt: null,
  protocolApprovalRequired: false,
  protocolApprovalRule: null,
  protocolApproverPersonIds: null,
  protocolContentRevision: 0,
  lastReopenReason: null,
  reviewStage: null,
  requiresFourEyeReview: false,
  visibilityScope: VisibilityScope.RESTRICTED,
  createdByUserId: "club-admin",
  visibleRoleRefs: [],
  visibleUserRefs: [],
  visibleTeamRefs: [],
  visibleOrgUnitRefs: [VL_ORG_UNIT_ID],
  visiblePersonRefs: [],
  visibleTargetGroupRefs: [],
};

describe("FCA VL meeting visibility parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue({ id: "mem-active" });
    prismaMocks.userRoleFindMany.mockResolvedValue([{ role: { key: CUSTOM_ROLE_KEY } }]);
    prismaMocks.meetingFindMany.mockResolvedValue([vlMeeting]);
    prismaMocks.meetingFindFirst.mockResolvedValue(vlMeeting);
    prismaMocks.personAssignmentFindMany.mockResolvedValue([]);
    prismaMocks.personFindFirst.mockResolvedValue({ id: PERSON_ID });
    prismaMocks.orgUnitMembershipFindMany.mockImplementation(
      async (args: { where?: { userId?: string; personId?: string } }) => {
        if (args.where?.personId === PERSON_ID) return [{ orgUnitId: VL_ORG_UNIT_ID }];
        if (args.where?.userId === USER_ID) return [];
        return [];
      },
    );
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE],
    });
  });

  it("grants list, detail, and programme gate when VL org scope is person-linked only", async () => {
    const actor = await getActorContext(
      { id: USER_ID, roleKeys: [], permissionKeys: [] },
      TENANT_ID,
    );
    expect(actor.orgUnitIds).toContain(VL_ORG_UNIT_ID);

    const meetings = await getMeetings(actor);
    expect(meetings).toHaveLength(1);

    const detail = await getMeetingBySlug(vlMeeting.slug, actor);
    expect(detail).not.toBeNull();

    expect(
      canIncludeMeetingInPersonalProgrammeForActor(actor, {
        ...vlMeeting,
        tenantId: TENANT_ID,
        status: vlMeeting.status,
      }),
    ).toBe(true);
  });

  it("fails closed for inactive membership across list and programme gate", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);
    const actor = await getActorContext(
      { id: USER_ID, roleKeys: [], permissionKeys: [PERMISSIONS.MEETINGS_VIEW] },
      TENANT_ID,
    );
    expect(actor.permissionKeys).toEqual([]);
    expect(actor.orgUnitIds).toEqual([]);
    const meetings = await getMeetings(actor);
    expect(meetings).toEqual([]);
    expect(
      canIncludeMeetingInPersonalProgrammeForActor(actor, {
        ...vlMeeting,
        tenantId: TENANT_ID,
        status: vlMeeting.status,
      }),
    ).toBe(false);
  });

  it("does not grant RESTRICTED visibility from role capability flags without org or allowlist match", async () => {
    prismaMocks.orgUnitMembershipFindMany.mockResolvedValue([]);
    const actor = await getActorContext(
      { id: USER_ID, roleKeys: [], permissionKeys: [] },
      TENANT_ID,
    );
    expect(actor.roleKeys).toContain(CUSTOM_ROLE_KEY);
    expect(actor.orgUnitIds).toEqual([]);
    const meetings = await getMeetings(actor);
    expect(meetings).toEqual([]);
  });
});