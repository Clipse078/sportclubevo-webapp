/**
 * SCE-ACCESS-INVITATION-ACTIVATION-01 — canonical invitation activation regression tests.
 */

import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  consumeExistingUserInvitationToken,
  consumePasswordResetToken,
  hashResetToken,
  inspectPasswordResetToken,
} from "@/lib/auth/password-reset";
import { passwordResetTokenIssueMessage } from "@/lib/auth/invitation-token-messages";
import { AUTH_SECURITY_MESSAGES } from "@/lib/security/abuse-policy";

type MockToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  isInvitation: boolean;
  invitationTenantId: string | null;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
    userRoles: { id: string }[];
  };
};

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const USER_ID = "user-1";
const FUTURE = new Date(Date.now() + 60 * 60 * 1000);

function makeToken(overrides: Partial<MockToken> = {}): MockToken {
  return {
    id: "tok-1",
    userId: USER_ID,
    tokenHash: "hash-1",
    expiresAt: FUTURE,
    usedAt: null,
    isInvitation: true,
    invitationTenantId: TENANT_A,
    user: {
      id: USER_ID,
      email: "pilot@example.test",
      isActive: true,
      lastLoginAt: null,
      passwordChangedAt: null,
      userRoles: [],
    },
    ...overrides,
  };
}

function makePrisma(state: {
  token: MockToken | null;
  membershipActive?: boolean;
  membershipExists?: boolean;
}) {
  let membershipActive = state.membershipActive ?? false;
  const membershipExists = state.membershipExists ?? true;
  let usedAt = state.token?.usedAt ?? null;
  let passwordChangedAt = state.token?.user.passwordChangedAt ?? null;

  const passwordResetToken = {
    findUnique: vi.fn(() =>
      state.token
        ? {
            ...state.token,
            usedAt,
            user: {
              ...state.token.user,
              passwordChangedAt,
            },
          }
        : null,
    ),
    updateMany: vi.fn(({ data }: { data: { usedAt?: Date } }) => {
      if (usedAt !== null) return { count: 0 };
      usedAt = data.usedAt ?? new Date();
      return { count: 1 };
    }),
    deleteMany: vi.fn(() => ({ count: 0 })),
  };

  const tenantMembership = {
    findUnique: vi.fn(() =>
      membershipExists
        ? { isActive: membershipActive }
        : null,
    ),
    updateMany: vi.fn(() => {
      membershipActive = true;
      return { count: 1 };
    }),
  };

  const user = {
    update: vi.fn(({ data }: { data: { passwordChangedAt?: Date } }) => {
      if (data.passwordChangedAt) passwordChangedAt = data.passwordChangedAt;
      return {};
    }),
  };

  const auditLog = { create: vi.fn(() => ({})) };

  const tx = {
    $executeRawUnsafe: vi.fn(() => Promise.resolve()),
    passwordResetToken,
    tenantMembership,
    user,
    auditLog,
  };

  const prisma = {
    passwordResetToken: {
      findUnique: passwordResetToken.findUnique,
    },
    tenantMembership: {
      findUnique: tenantMembership.findUnique,
    },
    $transaction: vi.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  } as unknown as PrismaClient;

  return {
    prisma,
    tx,
    getMembershipActive: () => membershipActive,
    getUsedAt: () => usedAt,
    getPasswordChangedAt: () => passwordChangedAt,
  };
}

describe("invitation activation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates membership atomically when a new invited user sets a password", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const { prisma, getMembershipActive, getUsedAt } = makePrisma({
      token: makeToken({ tokenHash: hashResetToken(raw) }),
    });

    const result = await consumePasswordResetToken(prisma, raw, "ValidPassword123!");
    expect(result?.isInvitation).toBe(true);
    expect(getMembershipActive()).toBe(true);
    expect(getUsedAt()).not.toBeNull();
  });

  it("does not consume invitation when membership activation target is missing", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const { prisma, getUsedAt, getMembershipActive } = makePrisma({
      token: makeToken({ tokenHash: hashResetToken(raw) }),
      membershipExists: false,
    });

    const result = await consumePasswordResetToken(prisma, raw, "ValidPassword123!");
    expect(result).toBeNull();
    expect(getUsedAt()).toBeNull();
    expect(getMembershipActive()).toBe(false);
  });

  it("maps expired invitation tokens to safe German UX", () => {
    expect(
      passwordResetTokenIssueMessage("expired", true),
    ).toBe(AUTH_SECURITY_MESSAGES.invitationExpired);
  });

  it("maps consumed invitation tokens to safe German UX", () => {
    expect(
      passwordResetTokenIssueMessage("consumed", true),
    ).toBe(AUTH_SECURITY_MESSAGES.invitationAlreadyUsed);
  });

  it("maps already activated accounts to safe German UX", () => {
    expect(
      passwordResetTokenIssueMessage("membership_already_active", true),
    ).toBe(AUTH_SECURITY_MESSAGES.accountAlreadyActivated);
  });

  it("reports cross-tenant mismatch without exposing tenant identifiers", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const { prisma } = makePrisma({
      token: makeToken({
        tokenHash: hashResetToken(raw),
        invitationTenantId: TENANT_B,
      }),
      membershipExists: false,
    });

    const inspected = await inspectPasswordResetToken(prisma, raw);
    expect(inspected.valid).toBe(false);
    if (!inspected.valid) {
      expect(inspected.issue).toBe("cross_tenant_mismatch");
    }
  });

  it("activates membership for existing SCE users accepting a tenant invitation", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const { prisma, getMembershipActive } = makePrisma({
      token: makeToken({
        tokenHash: hashResetToken(raw),
        user: {
          ...makeToken().user,
          lastLoginAt: new Date(),
        },
      }),
    });

    const result = await consumeExistingUserInvitationToken(prisma, raw);
    expect(result?.isExistingUser).toBe(true);
    expect(getMembershipActive()).toBe(true);
  });

  it("treats expired invitation tokens as invalid for consumption", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const past = new Date(Date.now() - 60_000);
    const { prisma } = makePrisma({
      token: makeToken({ tokenHash: hashResetToken(raw), expiresAt: past }),
    });

    const inspected = await inspectPasswordResetToken(prisma, raw);
    expect(inspected).toMatchObject({ valid: false, issue: "expired", isInvitation: true });
    expect(await consumePasswordResetToken(prisma, raw, "ValidPassword123!")).toBeNull();
  });

  it("treats consumed invitation tokens as invalid for consumption", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const { prisma } = makePrisma({
      token: makeToken({
        tokenHash: hashResetToken(raw),
        usedAt: new Date(),
      }),
    });

    const inspected = await inspectPasswordResetToken(prisma, raw);
    expect(inspected).toMatchObject({ valid: false, issue: "consumed", isInvitation: true });
  });

  it("uses the generic technical failure message for unexpected server errors", () => {
    expect(AUTH_SECURITY_MESSAGES.activationTechnicalFailure).toContain(
      "Ein Fehler ist aufgetreten",
    );
  });

  it("retry after a failed activation attempt remains safe when token was not consumed", async () => {
    const raw = crypto.randomBytes(16).toString("hex");
    const first = makePrisma({
      token: makeToken({ tokenHash: hashResetToken(raw) }),
      membershipExists: false,
    });

    expect(await consumePasswordResetToken(first.prisma, raw, "ValidPassword123!")).toBeNull();

    const second = makePrisma({
      token: makeToken({ tokenHash: hashResetToken(raw) }),
      membershipExists: true,
    });
    expect(await consumePasswordResetToken(second.prisma, raw, "ValidPassword123!")).not.toBeNull();
  });
});
