/**
 * FCA VL — Patrick-equivalent chain: PersonAssignment → orgUnitIds → RESTRICTED meetings.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { explainVisibilityDenial } from "@/lib/visibility/explain-visibility-denial";

const TENANT_ID = "tenant-fca";
const USER_ID = "user-patrick";
const CUSTOM_ROLE_KEY = "custom_cmomwboa_muo3h094_qab2j7";

const VL_ORG_UNIT_ID = "cmq574tey000004l80y4vqd17";

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindFirst: vi.fn(),
  userRoleFindMany: vi.fn(),
  meetingFindMany: vi.fn(),
  meetingFindFirst: vi.fn(),
  personAssignmentFindMany: vi.fn().mockResolvedValue([{ orgUnitId: "cmq574tey000004l80y4vqd17" }]),
  personFindFirst: vi.fn().mockResolvedValue(null),
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
      findMany: vi.fn().mockResolvedValue([]),
    },
    personAssignment: {
      findMany: (...args: unknown[]) => prismaMocks.personAssignmentFindMany(...args),
    },
    person: {
      findFirst: (...args: unknown[]) => prismaMocks.personFindFirst(...args),
    },
    targetGroup: { findMany: vi.fn().mockResolvedValue([]) },
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
import { getMeetings } from "@/lib/meetings/queries";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

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

describe("FCA VL Patrick meeting visibility chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue({ id: "mem-active" });
    prismaMocks.userRoleFindMany.mockResolvedValue([{ role: { key: CUSTOM_ROLE_KEY } }]);
    prismaMocks.meetingFindMany.mockResolvedValue([vlMeeting]);
    prismaMocks.meetingFindFirst.mockResolvedValue(vlMeeting);
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: [
        PERMISSIONS.MEETINGS_VIEW,
        PERMISSIONS.MEETINGS_MANAGE,
        ...PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys,
      ],
    });
  });

  it("lists VL meetings when org scope comes from PersonAssignment only", async () => {
    const actor = await getActorContext(
      { id: USER_ID, roleKeys: ["pilot_praesident"], permissionKeys: [] },
      TENANT_ID,
    );
    expect(actor.roleKeys).toEqual([CUSTOM_ROLE_KEY]);
    expect(actor.orgUnitIds).toContain(VL_ORG_UNIT_ID);

    const denialBefore = explainVisibilityDenial(vlMeeting, actor);
    expect(denialBefore.visible).toBe(true);
    expect(denialBefore.code).toBe("restricted_org_unit_allowlist_match");

    const meetings = await getMeetings(actor);
    expect(meetings).toHaveLength(1);
    expect(meetings[0]?.slug).toBe(vlMeeting.slug);
  });

  it("re-hydrates DB role keys for impersonation JWT carry-over", async () => {
    const actor = await getActorContext(
      {
        id: USER_ID,
        roleKeys: ["pilot_praesident"],
        permissionKeys: [PERMISSIONS.MEETINGS_VIEW, PERMISSIONS.MEETINGS_MANAGE],
      },
      TENANT_ID,
    );
    expect(actor.roleKeys).toEqual([CUSTOM_ROLE_KEY]);
    expect(actor.orgUnitIds).toContain(VL_ORG_UNIT_ID);
  });

  it("fails closed without active membership even if JWT lists permissions", async () => {
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue(null);
    const actor = await getActorContext(
      {
        id: USER_ID,
        roleKeys: [CUSTOM_ROLE_KEY],
        permissionKeys: [PERMISSIONS.MEETINGS_VIEW],
      },
      TENANT_ID,
    );
    expect(actor.permissionKeys).toEqual([]);
    expect(actor.orgUnitIds).toEqual([]);
    const meetings = await getMeetings(actor);
    expect(meetings).toEqual([]);
  });
});