import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisibilityScope } from "@prisma/client";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { canSeeEntity } from "@/lib/visibility/visibility-filter";
import { FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
const TENANT_ID = "tenant-fca";
const ACTOR_ID = "actor-admin";
const ORG_UNIT_ID = "org-vl";
const ROLE_ID = "role-contributor";

const prismaMock = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  role: { findFirst: vi.fn() },
  orgUnit: { findFirst: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const resolveRowsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/vl-onboarding/resolve-vl-invitation-rows", () => ({
  resolveVlInvitationRows: resolveRowsMock,
  resolveVlInvitationPresetRoleState: vi.fn(async () => ({
    presetRoleId: ROLE_ID,
    contributorRoleProvisioned: true,
  })),
}));

const createPersonAndInvite = vi.hoisted(() => vi.fn());
const invitePersonToTenant = vi.hoisted(() => vi.fn());
const resendTenantInvitation = vi.hoisted(() => vi.fn());
const ensureVlPersonOrgAssignment = vi.hoisted(() => vi.fn());
const buildVlInvitationEmailContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/users/mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/users/mutations")>();
  return {
    ...actual,
    createPersonAndInvite,
    invitePersonToTenant,
    resendTenantInvitation,
  };
});

vi.mock("@/lib/admin/vl-onboarding/ensure-vl-person-org-assignment", () => ({
  ensureVlPersonOrgAssignment,
}));

vi.mock("@/lib/admin/vl-onboarding/vl-invitation-email-content", () => ({
  buildVlInvitationEmailContent,
  VL_INVITATION_ACCESS_SUMMARY: "Vereinsleitung — Vereinsentwicklung",
}));

import { orchestrateVlInvitationSend } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";
import { createMockVlInvitationTransport } from "@/lib/admin/vl-onboarding/vl-invitation-transport";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

describe("vl invitation orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue({
      key: "fc-allschwil",
      name: "FC Allschwil",
    });
    prismaMock.role.findFirst.mockResolvedValue({
      id: ROLE_ID,
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: true,
      rolePermissions: FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys.map((key) => ({
        permission: { key },
      })),
    });
    prismaMock.orgUnit.findFirst.mockResolvedValue({ id: ORG_UNIT_ID });
    buildVlInvitationEmailContent.mockResolvedValue({
      subject: "Einladung zu FC Allschwil auf SportClubEvo",
      html: "<html>#9A5F28</html>",
      text: "plain",
      variant: "new_account",
    });
    createPersonAndInvite.mockResolvedValue({
      userId: "user-new",
      personId: "person-new",
      rawToken: "token-a",
    });
    invitePersonToTenant.mockResolvedValue({
      userId: "user-existing",
      rawToken: "token-b",
    });
    resendTenantInvitation.mockResolvedValue("token-c");
    ensureVlPersonOrgAssignment.mockResolvedValue({ created: true, assignmentId: "pa-1" });
  });

  it("dry-run delivers mock transport without persistence", async () => {
    resolveRowsMock.mockResolvedValue([
      { email: "irem.uysal@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
    ]);
    const transport = createMockVlInvitationTransport();
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
      transport,
      liveExecution: false,
      sendPolicyMode: "DRY_RUN",
      sendPolicyError: "Dry-Run",
    });

    expect(result.sent).toBe(false);
    expect(result.preservedDraft).toBe(true);
    expect(createPersonAndInvite).not.toHaveBeenCalled();
    expect(transport.deliveries).toHaveLength(1);
    expect(buildVlInvitationEmailContent).toHaveBeenCalled();
  });

  it("suppresses duplicate mock transport deliveries in one batch", async () => {
    resolveRowsMock.mockResolvedValue([
      { email: "dup@test.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
      { email: "dup@test.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
    ]);
    const transport = createMockVlInvitationTransport();
    const result = await orchestrateVlInvitationSend({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      validationRows: [
        { raw: "dup@test.ch", normalized: "dup@test.ch", valid: true, duplicate: false },
        { raw: "dup@test.ch", normalized: "dup@test.ch", valid: true, duplicate: true },
      ],
      transport,
      liveExecution: false,
      sendPolicyMode: "DRY_RUN",
    });

    expect(transport.deliveries).toHaveLength(1);
    expect(result.transport.some((t) => t.duplicateSuppressed)).toBe(true);
  });

  it("live path provisions invite, org assignment, and uses canonical email", async () => {
    resolveRowsMock.mockResolvedValue([
      { email: "irem.uysal@fcallschwil.ch", action: "NEW_INVITATION", label: "Neue Einladung" },
    ]);

    const transport = {
      mode: "LIVE_ALLOWED" as const,
      deliver: vi.fn(async () => ({
        queued: true,
        mode: "LIVE" as const,
        recipientEmail: "irem.uysal@fcallschwil.ch",
        subject: "Einladung",
      })),
    };

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

    expect(result.sent).toBe(true);
    expect(createPersonAndInvite).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ email: "irem.uysal@fcallschwil.ch" }),
      ACTOR_ID,
      expect.objectContaining({
        roleIds: [ROLE_ID],
        sendInvitation: false,
        issueInvitationToken: true,
      }),
    );
    expect(ensureVlPersonOrgAssignment).toHaveBeenCalled();
    expect(buildVlInvitationEmailContent).toHaveBeenCalledWith(
      expect.objectContaining({ rawToken: "token-a" }),
    );
    expect(transport.deliver).toHaveBeenCalled();
  });

  it("rejects cross-tenant / non-pilot tenant", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ key: "other-club", name: "Other" });
    resolveRowsMock.mockResolvedValue([]);
    await expect(
      orchestrateVlInvitationSend({
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
        validationRows: [],
        transport: createMockVlInvitationTransport(),
        liveExecution: false,
        sendPolicyMode: "DRY_RUN",
      }),
    ).rejects.toThrow(/FC Allschwil/);
  });

  it("skips live rows when contributor role is missing", async () => {
    prismaMock.role.findFirst.mockResolvedValue(null);
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

    expect(result.contributorRoleProvisioned).toBe(false);
    expect(result.rows[0]?.status).toBe("skipped");
    expect(createPersonAndInvite).not.toHaveBeenCalled();
  });
});

describe("VL acceptance visibility (restricted meetings)", () => {
  it("does not grant restricted meeting visibility from capability flags alone", () => {
    const meeting = {
      visibilityScope: VisibilityScope.RESTRICTED,
      createdByUserId: "creator",
      visibleRoleRefs: [FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey],
      visibleUserRefs: [],
      visibleTeamRefs: [],
      visibleOrgUnitRefs: [],
      visiblePersonRefs: [],
    };

    const flagsOnlyActor: ActorContext = {
      userId: "user-1",
      roleKeys: [],
      permissionKeys: ["meetings.view", "meetings.manage"],
      tenantId: TENANT_ID,
      orgUnitIds: [ORG_UNIT_ID],
      targetGroupIds: [],
    };

    expect(canSeeEntity(meeting, flagsOnlyActor)).toBe(false);

    const contributorActor: ActorContext = {
      ...flagsOnlyActor,
      roleKeys: [FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.roleKey],
    };
    expect(canSeeEntity(meeting, contributorActor)).toBe(true);
  });
});

describe("effective permission resolver import", () => {
  it("exports resolver for actor resolution proofs", () => {
    expect(createEffectivePermissionResolver).toBeTypeOf("function");
  });
});