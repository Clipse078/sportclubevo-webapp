import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  authorizeCredentialsUser,
  normalizeLoginEmail,
} from "@/lib/auth/credentials-authorize";

const logLoginFailure = vi.fn();

vi.mock("@/lib/security/security-events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/security-events")>();
  return {
    ...actual,
    logLoginFailure: (...args: unknown[]) => logLoginFailure(...args),
  };
});

vi.mock("@/lib/auth/login-timing", () => ({
  runLoginTimingMitigation: vi.fn().mockResolvedValue(undefined),
}));

function makePrisma(overrides: {
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  } | null;
  sessionThrows?: boolean;
}) {
  const passwordHash =
    overrides.user?.passwordHash ??
    bcrypt.hashSync("fixture-password-12chars", 12);

  const user =
    overrides.user === null
      ? null
      : {
          id: "user-1",
          email: "fixture@example.test",
          firstName: "Fix",
          lastName: "Ture",
          isActive: true,
          passwordHash,
          ...overrides.user,
        };

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue({}),
    },
    userRole: {
      findMany: vi.fn().mockResolvedValue([{ role: { key: "club_admin__fc-allschwil" } }]),
    },
    tenantMembership: {
      findMany: vi.fn().mockImplementation(async () => {
        if (overrides.sessionThrows) throw new Error("session query failed");
        return [
          {
            id: "m-1",
            tenant: { id: "t-1", key: "fc-allschwil", name: "FC Allschwil" },
          },
        ];
      }),
    },
    effectivePermissionResolver: undefined,
  } as unknown as import("@prisma/client").PrismaClient;
}

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: vi.fn().mockResolvedValue({
      platform: [],
      tenant: ["teams.view"],
    }),
  }),
}));

describe("normalizeLoginEmail", () => {
  it("lowercases and trims canonical login email", () => {
    expect(normalizeLoginEmail("  Fixture@Example.TEST  ")).toBe("fixture@example.test");
  });
});

describe("authorizeCredentialsUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves fixture user with valid password and tenant context", async () => {
    const prisma = makePrisma({});
    const result = await authorizeCredentialsUser(prisma, {
      email: "fixture@example.test",
      password: "fixture-password-12chars",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe("fixture@example.test");
      expect(result.user.activeTenantId).toBe("t-1");
      expect(result.user.permissionKeys).toContain("teams.view");
    }
  });

  it("rejects invalid fixture password with CREDENTIAL_VERIFICATION_FAILED", async () => {
    const prisma = makePrisma({});
    const result = await authorizeCredentialsUser(prisma, {
      email: "fixture@example.test",
      password: "wrong-password-12",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("CREDENTIAL_VERIFICATION_FAILED");
    }
    expect(logLoginFailure).toHaveBeenCalledWith("CREDENTIAL_VERIFICATION_FAILED");
  });

  it("rejects disabled accounts", async () => {
    const prisma = makePrisma({
      user: {
        id: "u",
        email: "fixture@example.test",
        isActive: false,
        passwordHash: bcrypt.hashSync("fixture-password-12chars", 12),
      },
    });
    const result = await authorizeCredentialsUser(prisma, {
      email: "fixture@example.test",
      password: "fixture-password-12chars",
    });
    expect(result).toEqual({ ok: false, category: "ACCOUNT_DISABLED" });
  });

  it("rejects missing user without leaking enumeration in public API", async () => {
    const prisma = makePrisma({ user: null });
    const result = await authorizeCredentialsUser(prisma, {
      email: "missing@example.test",
      password: "fixture-password-12chars",
    });
    expect(result).toEqual({ ok: false, category: "USER_NOT_FOUND" });
    expect(logLoginFailure).toHaveBeenCalledWith("USER_NOT_FOUND");
  });

  it("surfaces SESSION_CONTEXT_FAILED when tenant resolution throws", async () => {
    const prisma = makePrisma({ sessionThrows: true });
    const result = await authorizeCredentialsUser(prisma, {
      email: "fixture@example.test",
      password: "fixture-password-12chars",
    });
    expect(result).toEqual({ ok: false, category: "SESSION_CONTEXT_FAILED" });
  });
});
