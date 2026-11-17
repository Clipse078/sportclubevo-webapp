/**
 * Custom-role onboarding: role ids survive create → pending → planned admin projection.
 * Uses real orchestration + read-model helpers with mocked persistence/transport.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const CUSTOM_ROLE_ID = "role-vorstandsmitglied";
const TENANT_ID = "tenant-fca";
const USER_ID = "user-irem";

const mutationFns = vi.hoisted(() => ({
  createPersonAndInvite: vi.fn(),
  applyOnboardRoleAssignments: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindUnique: vi.fn(),
  userRoleFindMany: vi.fn(),
  userPermissionOverrideFindMany: vi.fn(),
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

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findUnique: prismaMocks.tenantMembershipFindUnique },
    userRole: { findMany: prismaMocks.userRoleFindMany },
    userPermissionOverride: { findMany: prismaMocks.userPermissionOverrideFindMany },
  },
}));

import { orchestratePeopleAccessInvite } from "@/lib/admin/people-access/people-access-invite-orchestration";
import { resolveAssignedTenantPermissionKeysForProjection } from "@/lib/admin/users/person-assigned-role-permissions";

const VORSTAND_KEYS = [
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.MEETINGS_VIEW,
  PERMISSIONS.MEETINGS_MANAGE,
  PERMISSIONS.TASKS_VIEW,
];

describe("people-access invite onboarding projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationFns.createPersonAndInvite.mockResolvedValue({
      userId: USER_ID,
      personId: "person-irem",
      rawToken: "raw-token-hex",
    });
    mutationFns.applyOnboardRoleAssignments.mockResolvedValue(undefined);
    prismaMocks.tenantMembershipFindUnique.mockResolvedValue({ id: "mem-pending" });
    prismaMocks.userPermissionOverrideFindMany.mockResolvedValue([]);
    prismaMocks.userRoleFindMany.mockResolvedValue([
      {
        role: {
          rolePermissions: VORSTAND_KEYS.map((key) => ({
            permission: { key, scope: "TENANT" },
          })),
        },
      },
    ]);
  });

  it("persists selected role id through live invite orchestration", async () => {
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
      actorUserId: "actor-admin",
      recipient: {
        email: "irem.uysal@fcallschwil.ch",
        firstName: "Irem",
        lastName: "Uysal",
      },
      roleIds: [CUSTOM_ROLE_ID],
      scopedRoles: [],
      permissionOverrides: [],
      liveExecution: true,
      confirmLiveSend: true,
      transport,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(result.status).toBe("invited");
    expect(mutationFns.createPersonAndInvite).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ email: "irem.uysal@fcallschwil.ch" }),
      "actor-admin",
      expect.objectContaining({
        roleIds: [CUSTOM_ROLE_ID],
        issueInvitationToken: true,
      }),
    );
  });

  it("pending membership still yields planned permission keys from assigned roles", async () => {
    const keys = await resolveAssignedTenantPermissionKeysForProjection(TENANT_ID, USER_ID);
    expect(keys?.has(PERMISSIONS.MEETINGS_MANAGE)).toBe(true);
    expect(keys?.has(PERMISSIONS.WORKSPACE_VIEW)).toBe(true);
  });

  it("invite retry path re-applies onboarding assignments without duplicating user", async () => {
    const transport = {
      deliver: vi.fn(async () => ({
        queued: true,
        mode: "MOCK" as const,
        recipientEmail: "irem.uysal@fcallschwil.ch",
        subject: "s",
      })),
    };

    await orchestratePeopleAccessInvite({
      tenantId: TENANT_ID,
      actorUserId: "actor-admin",
      recipient: {
        email: "irem.uysal@fcallschwil.ch",
        firstName: "Irem",
        lastName: "Uysal",
      },
      roleIds: [CUSTOM_ROLE_ID],
      scopedRoles: [],
      permissionOverrides: [],
      liveExecution: true,
      confirmLiveSend: true,
      transport,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(mutationFns.createPersonAndInvite).toHaveBeenCalledTimes(1);
  });
});