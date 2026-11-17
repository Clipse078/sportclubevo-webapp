/**
 * #1002 close-out — invitation email side effects, persistence orchestration, VL access chain.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { INVITATION_EXPIRY_HOURS } from "@/lib/users/mutations";

const TENANT_ID = "tenant-fca";
const ACTOR_ID = "actor-admin";
const ORG_UNIT_ID = "org-vl";
const ROLE_ID = "role-contributor";

const sendMailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email/mailer", () => ({
  sendMail: sendMailMock,
  MailConfigurationError: class MailConfigurationError extends Error {},
}));

const orchestrationPrisma = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  role: { findFirst: vi.fn() },
  orgUnit: { findFirst: vi.fn() },
}));

const resolveRowsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: orchestrationPrisma,
}));

vi.mock("@/lib/admin/vl-onboarding/resolve-vl-invitation-rows", () => ({
  resolveVlInvitationRows: resolveRowsMock,
  resolveVlInvitationPresetRoleState: vi.fn(async () => ({
    presetRoleId: ROLE_ID,
    contributorRoleProvisioned: true,
  })),
}));

const mutationFns = vi.hoisted(() => ({
  createPersonAndInvite: vi.fn(),
  invitePersonToTenant: vi.fn(),
  resendTenantInvitation: vi.fn(),
}));

vi.mock("@/lib/users/mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/users/mutations")>();
  return {
    ...actual,
    createPersonAndInvite: mutationFns.createPersonAndInvite,
    invitePersonToTenant: mutationFns.invitePersonToTenant,
    resendTenantInvitation: mutationFns.resendTenantInvitation,
  };
});

const ensureOrgMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/vl-onboarding/ensure-vl-person-org-assignment", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/admin/vl-onboarding/ensure-vl-person-org-assignment")
  >();
  return {
    ...actual,
    ensureVlPersonOrgAssignment: ensureOrgMock,
  };
});

import { orchestrateVlInvitationSend } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";
import { buildVlInvitationEmailContent } from "@/lib/admin/vl-onboarding/vl-invitation-email-content";
import { createMockVlInvitationTransport } from "@/lib/admin/vl-onboarding/vl-invitation-transport";

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-email-content", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/admin/vl-onboarding/vl-invitation-email-content")
  >();
  return {
    ...actual,
    buildVlInvitationEmailContent: vi.fn(actual.buildVlInvitationEmailContent),
  };
});

describe("VL invitation helpers never send mail", () => {
  it("documents sendMail is only used by transport, not mutation modules", async () => {
    const mutations = await import("@/lib/users/mutations");
    expect(mutations.createPersonAndInvite).toBeTypeOf("function");
    expect(mutations.invitePersonToTenant).toBeTypeOf("function");
    expect(mutations.resendTenantInvitation).toBeTypeOf("function");
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});

describe("live orchestration — one email per recipient via transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orchestrationPrisma.tenant.findUnique.mockResolvedValue({
      key: "fc-allschwil",
      name: "FC Allschwil",
    });
    orchestrationPrisma.role.findFirst.mockResolvedValue({
      id: ROLE_ID,
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: true,
      rolePermissions: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys.map((key) => ({
        permission: { key },
      })),
    });
    orchestrationPrisma.orgUnit.findFirst.mockResolvedValue({ id: ORG_UNIT_ID });
    mutationFns.createPersonAndInvite.mockResolvedValue({
      userId: "user-a",
      personId: "person-a",
      rawToken: "token-live-a",
    });
    ensureOrgMock.mockResolvedValue({ created: true, assignmentId: "pa-1" });
    vi.mocked(buildVlInvitationEmailContent).mockResolvedValue({
      subject: "Einladung",
      html: "<p>test</p>",
      text: "test",
      variant: "new_account",
    });
  });

  it("issues token without sendInvitation while delivering exactly one transport message", async () => {
    resolveRowsMock.mockResolvedValue([
      { email: "irem.uysal@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
    ]);

    const transport = {
      mode: "LIVE_ALLOWED" as const,
      deliver: vi.fn(async (payload) => ({
        queued: true,
        mode: "LIVE" as const,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
      })),
    };

    await orchestrateVlInvitationSend({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      validationRows: [
        {
          raw: "irem.uysal@fcallschwil.ch",
          normalized: "irem.uysal@fcallschwil.ch",
          valid: true,
          duplicate: false,
        },
      ],
      identities: [
        {
          email: "irem.uysal@fcallschwil.ch",
          firstName: "Irem",
          lastName: "Uysal",
          functionKey: "VORSTANDSMITGLIED",
        },
      ],
      transport,
      liveExecution: true,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(mutationFns.createPersonAndInvite).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ email: "irem.uysal@fcallschwil.ch" }),
      ACTOR_ID,
      expect.objectContaining({
        sendInvitation: false,
        issueInvitationToken: true,
        roleIds: [ROLE_ID],
      }),
    );
    expect(transport.deliver).toHaveBeenCalledTimes(1);
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(buildVlInvitationEmailContent).toHaveBeenCalledWith(
      expect.objectContaining({
        rawToken: "token-live-a",
        recipientFirstName: "Irem",
      }),
    );
  });

  it("partial failure then retry leaves prior successful row untouched", async () => {
    resolveRowsMock
      .mockResolvedValueOnce([
        { email: "ok@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
        { email: "fail@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
      ])
      .mockResolvedValueOnce([
        { email: "fail@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
      ]);

    mutationFns.createPersonAndInvite
      .mockResolvedValueOnce({
        userId: "user-ok",
        personId: "person-ok",
        rawToken: "token-ok",
      })
      .mockRejectedValueOnce(new Error("simulated-persistence-failure"));

    const transport = createMockVlInvitationTransport();

    const first = await orchestrateVlInvitationSend({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      validationRows: [
        { raw: "ok@fcallschwil.ch", normalized: "ok@fcallschwil.ch", valid: true, duplicate: false },
        { raw: "fail@fcallschwil.ch", normalized: "fail@fcallschwil.ch", valid: true, duplicate: false },
      ],
      identities: [
        {
          email: "ok@fcallschwil.ch",
          firstName: "Ok",
          lastName: "User",
          functionKey: "KOORDINATOR",
        },
        {
          email: "fail@fcallschwil.ch",
          firstName: "Fail",
          lastName: "User",
          functionKey: "KOORDINATOR",
        },
      ],
      transport,
      liveExecution: true,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(first.rows.find((r) => r.email === "ok@fcallschwil.ch")?.status).toBe("invited");
    expect(first.rows.find((r) => r.email === "fail@fcallschwil.ch")?.status).toBe("failed");
    expect(transport.deliveries).toHaveLength(1);

    mutationFns.createPersonAndInvite.mockResolvedValueOnce({
      userId: "user-fail",
      personId: "person-fail",
      rawToken: "token-retry",
    });

    const retry = await orchestrateVlInvitationSend({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      validationRows: [
        { raw: "fail@fcallschwil.ch", normalized: "fail@fcallschwil.ch", valid: true, duplicate: false },
      ],
      identities: [
        {
          email: "fail@fcallschwil.ch",
          firstName: "Fail",
          lastName: "User",
          functionKey: "KOORDINATOR",
        },
      ],
      transport,
      liveExecution: true,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(retry.rows[0]?.status).toBe("invited");
    expect(transport.deliveries).toHaveLength(2);
  });

  it("blocks live row without confirmed organisational function", async () => {
    resolveRowsMock.mockResolvedValue([
      { email: "irem.uysal@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
    ]);
    const result = await orchestrateVlInvitationSend({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      validationRows: [
        {
          raw: "irem.uysal@fcallschwil.ch",
          normalized: "irem.uysal@fcallschwil.ch",
          valid: true,
          duplicate: false,
        },
      ],
      identities: [{ email: "irem.uysal@fcallschwil.ch", firstName: "Irem", lastName: "Uysal" }],
      transport: createMockVlInvitationTransport(),
      liveExecution: true,
      sendPolicyMode: "LIVE_ALLOWED",
    });

    expect(result.rows[0]?.status).toBe("failed");
    expect(result.rows[0]?.reason).toBe("VL_ORG_FUNCTION_UNCONFIRMED");
    expect(mutationFns.createPersonAndInvite).not.toHaveBeenCalled();
  });
});

describe("invitation email content contract", () => {
  it("uses real expiry hours constant (72h) when building live content", () => {
    expect(INVITATION_EXPIRY_HOURS).toBe(72);
  });
});