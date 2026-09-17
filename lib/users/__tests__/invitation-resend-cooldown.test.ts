import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  membershipFindUnique: vi.fn(),
  tokenFindFirst: vi.fn(),
  tokenDeleteMany: vi.fn(),
  tokenCreate: vi.fn(),
  userRoleFindFirst: vi.fn(),
  userRoleFindMany: vi.fn(),
  assertTenantDelegationAllowed: vi.fn(),
}));

vi.mock("@/lib/roles/delegation", () => ({
  assertTenantDelegationAllowed: mocks.assertTenantDelegationAllowed,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findUnique: mocks.membershipFindUnique },
    passwordResetToken: {
      findFirst: mocks.tokenFindFirst,
      deleteMany: mocks.tokenDeleteMany,
      create: mocks.tokenCreate,
    },
    userRole: {
      findFirst: mocks.userRoleFindFirst,
      findMany: mocks.userRoleFindMany,
    },
  },
}));
vi.mock("@/lib/audit/log-action", () => ({ logAction: vi.fn() }));

import { resendTenantInvitation, InvitationDomainError } from "../mutations";

const TENANT_ID = "tenant-001";
const USER_ID = "user-001";
const ACTOR_ID = "actor-001";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.membershipFindUnique.mockResolvedValue({ isActive: true });
  mocks.userRoleFindFirst.mockResolvedValue(null);
  mocks.userRoleFindMany.mockResolvedValue([]);
  mocks.assertTenantDelegationAllowed.mockResolvedValue(undefined);
  mocks.tokenDeleteMany.mockResolvedValue({ count: 0 });
  mocks.tokenCreate.mockResolvedValue({ id: "token-1" });
  mocks.tokenFindFirst.mockResolvedValue(null);
});

describe("resendTenantInvitation cooldown", () => {
  it("rejects resend within 60-second cooldown window", async () => {
    mocks.tokenFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 30_000),
    });

    await expect(
      resendTenantInvitation(TENANT_ID, USER_ID, ACTOR_ID),
    ).rejects.toMatchObject({ code: "INVITATION_RESEND_COOLDOWN" });

    expect(mocks.tokenCreate).not.toHaveBeenCalled();
  });

  it("allows resend after cooldown window", async () => {
    mocks.tokenFindFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 61_000),
    });

    const rawToken = await resendTenantInvitation(TENANT_ID, USER_ID, ACTOR_ID);
    expect(typeof rawToken).toBe("string");
    expect(mocks.tokenCreate).toHaveBeenCalled();
  });
});
