/**
 * Custom tenant role "Vorstandsmitglied" — persist VL permissions + gates and
 * standard-invite orchestration without VL preset substitution.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { deriveTenantRoleVereinsleitungCapabilityFlags } from "@/lib/roles/tenant-role-vl-capability";
import { VisibilityScope } from "@prisma/client";
import { canSeeEntity } from "@/lib/visibility/visibility-filter";
import { getActorContext } from "@/lib/visibility/get-actor-context";

const CUSTOM_ROLE_ID = "role-vorstandsmitglied-custom";
const CUSTOM_ROLE_KEY = "custom_fc_vorstandsmitglied";
const TENANT_ID = "tenant-fca";
const ORG_UNIT_ID = "org-vl";

const VORSTANDSMITGLIED_PERMISSION_KEYS = [
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.WORKSPACE_VIEW,
  ...FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS,
];

const mutationFns = vi.hoisted(() => ({
  createPersonAndInvite: vi.fn(),
  applyOnboardRoleAssignments: vi.fn(),
}));

vi.mock("@/lib/users/mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/users/mutations")>();
  return {
    ...actual,
    createPersonAndInvite: mutationFns.createPersonAndInvite,
    applyOnboardRoleAssignments: mutationFns.applyOnboardRoleAssignments,
    invitePersonToTenant: vi.fn(),
    resendTenantInvitation: vi.fn(),
    InvitationDomainError: actual.InvitationDomainError,
  };
});

vi.mock("@/lib/admin/people-access/person-lookup", () => ({
  lookupPersonByEmailInTenant: vi.fn(async () => ({ kind: "not_found" as const })),
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-send-policy", () => ({
  assertVlInvitationSendAllowed: () => ({ ok: true, mode: "LIVE_ALLOWED" as const }),
  resolveVlInvitationSendMode: () => "LIVE_ALLOWED" as const,
}));

vi.mock("@/lib/admin/people-access/people-access-invite-email-preview", () => ({
  buildPeopleAccessInviteEmailPreview: vi.fn(async () => ({
    subject: "Einladung",
    html: "<p>x</p>",
    text: "x",
  })),
}));

vi.mock("@/lib/email/resolve-transactional-sce-email-logo-url", () => ({
  resolveTransactionalSceEmailLogoAbsoluteUrl: () => "https://example.com/logo.png",
}));

vi.mock("@/lib/server/security-link-url", () => ({
  resolveSecurityLinkBaseUrl: () => new URL("https://app.example.com"),
  buildPasswordResetLink: (token: string) => `https://app.example.com/invite/${token}`,
}));

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
  loadOrgUnitIds: vi.fn(),
  loadTargetGroupIds: vi.fn(),
}));

import { orchestratePeopleAccessInvite } from "@/lib/admin/people-access/people-access-invite-orchestration";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { loadOrgUnitIds } from "@/lib/org/queries";

describe("custom Vorstandsmitglied role configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationFns.createPersonAndInvite.mockResolvedValue({
      userId: "user-new",
      personId: "person-new",
      rawToken: "token-1",
    });
    mutationFns.applyOnboardRoleAssignments.mockResolvedValue(undefined);
    prismaMocks.tenantMembershipFindFirst.mockResolvedValue({ id: "mem-1" });
    prismaMocks.userRoleFindMany.mockResolvedValue([{ role: { key: CUSTOM_ROLE_KEY } }]);
    vi.mocked(getRequestEffectivePermissions).mockResolvedValue({
      platform: [],
      tenant: VORSTANDSMITGLIED_PERMISSION_KEYS,
    });
    vi.mocked(loadOrgUnitIds).mockResolvedValue([ORG_UNIT_ID]);
  });

  it("materialises Vereinsentwicklung workspace and meeting gates from saved permissions", () => {
    expect(deriveTenantRoleVereinsleitungCapabilityFlags(VORSTANDSMITGLIED_PERMISSION_KEYS)).toEqual({
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: true,
    });
  });

  it("standard invite orchestration keeps the selected custom role id (no VL preset swap)", async () => {
    const transport = {
      deliver: vi.fn(async (payload) => ({
        queued: true,
        mode: "MOCK" as const,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
      })),
    };

    const result = await orchestratePeopleAccessInvite({
      tenantId: TENANT_ID,
      actorUserId: "actor-1",
      recipient: {
        email: "board@fcallschwil.ch",
        firstName: "Board",
        lastName: "Member",
      },
      roleIds: [CUSTOM_ROLE_ID],
      scopedRoles: [
        { roleId: CUSTOM_ROLE_ID, orgUnitId: ORG_UNIT_ID, scopeMode: "THIS_ORG_UNIT" },
      ],
      permissionOverrides: [],
      liveExecution: true,
      confirmLiveSend: true,
      transport,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(result.status).toBe("invited");
    expect(mutationFns.createPersonAndInvite).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ email: "board@fcallschwil.ch" }),
      "actor-1",
      expect.objectContaining({
        roleIds: [CUSTOM_ROLE_ID],
        scopedRoles: [
          expect.objectContaining({ roleId: CUSTOM_ROLE_ID, orgUnitId: ORG_UNIT_ID }),
        ],
      }),
    );
    expect(result.userId).toBe("user-new");
  });

  it("org-scoped meeting access works through actor chain with custom role key", async () => {
    const restrictedMeeting = {
      id: "m-vl-custom",
      slug: "vorstand-custom",
      title: "Vorstand",
      visibilityScope: VisibilityScope.RESTRICTED,
      createdByUserId: "creator-1",
      visibleRoleRefs: [CUSTOM_ROLE_KEY],
      visibleUserRefs: [],
      visibleTeamRefs: [],
      visibleOrgUnitRefs: [],
      visiblePersonRefs: [],
      visibleTargetGroupRefs: [],
    };

    const actor = await getActorContext(
      { id: "user-board", roleKeys: [], permissionKeys: [] },
      TENANT_ID,
    );

    expect(actor.roleKeys).toEqual([CUSTOM_ROLE_KEY]);
    expect(actor.orgUnitIds).toContain(ORG_UNIT_ID);
    expect(canSeeEntity(restrictedMeeting, actor)).toBe(true);
  });
});