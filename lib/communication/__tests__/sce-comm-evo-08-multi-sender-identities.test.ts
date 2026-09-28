import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantCommunicationSenderIdentityStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  prisma: {
    tenant: { findFirst: vi.fn(), updateMany: vi.fn() },
    tenantCommunicationSenderIdentity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  providerAuthorization: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));
vi.mock("@/lib/email/mailer", () => ({
  getSenderDomainAuthorization: mocks.providerAuthorization,
}));

import {
  createTenantCommunicationSenderIdentity,
  isSenderIdentityUsable,
  listTenantCommunicationSenderIdentities,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import {
  EmailSenderResolutionError,
  resolveEffectiveEmailSender,
} from "@/lib/communication/sender-identity/sender-identity-resolution-service";

const TENANT_A = "tenant-a";

describe("SCE-COMM-EVO-08 multi-sender identities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_FROM = "SportClubEvo <noreply@mail.sportclubevo.com>";
    mocks.providerAuthorization.mockResolvedValue("VERIFIED");
  });

  it("lists multiple tenant senders", async () => {
    mocks.prisma.tenantCommunicationSenderIdentity.findMany.mockResolvedValue([
      {
        id: "s1",
        tenantId: TENANT_A,
        displayName: "FC Allschwil",
        emailAddress: "kommunikation@fcallschwil.ch",
        status: TenantCommunicationSenderIdentityStatus.ACTIVE,
        isDefault: true,
        scopeKind: "TENANT_WIDE",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      {
        id: "s2",
        tenantId: TENANT_A,
        displayName: "Frauen",
        emailAddress: "frauen@fcallschwil.ch",
        status: TenantCommunicationSenderIdentityStatus.ACTIVE,
        isDefault: false,
        scopeKind: "TENANT_WIDE",
        createdAt: new Date("2026-01-02"),
        updatedAt: new Date("2026-01-02"),
      },
    ]);

    const rows = await listTenantCommunicationSenderIdentities(TENANT_A);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.isDefault).toBe(true);
  });

  it("rejects explicit invalid sender without silent fallback", async () => {
    mocks.prisma.tenantCommunicationSenderIdentity.findFirst.mockResolvedValue({
      id: "bad",
      tenantId: TENANT_A,
      displayName: "Bad",
      emailAddress: "bad@fcallschwil.ch",
      status: TenantCommunicationSenderIdentityStatus.ACTIVE,
      isDefault: false,
      scopeKind: "TENANT_WIDE",
    });
    mocks.providerAuthorization.mockResolvedValue("NOT_VERIFIED");

    await expect(
      resolveEffectiveEmailSender({ tenantId: TENANT_A, explicitSenderIdentityId: "bad" }),
    ).rejects.toBeInstanceOf(EmailSenderResolutionError);
  });

  it("uses platform fallback when no explicit sender and default not verified", async () => {
    mocks.prisma.tenantCommunicationSenderIdentity.findFirst
      .mockResolvedValueOnce({
        id: "d1",
        tenantId: TENANT_A,
        displayName: "FC Allschwil",
        emailAddress: "kommunikation@fcallschwil.ch",
        status: TenantCommunicationSenderIdentityStatus.ACTIVE,
        isDefault: true,
        scopeKind: "TENANT_WIDE",
      })
      .mockResolvedValueOnce(null);
    mocks.providerAuthorization.mockResolvedValue("NOT_VERIFIED");

    const resolved = await resolveEffectiveEmailSender({ tenantId: TENANT_A });
    expect(resolved.source).toBe("PLATFORM");
    expect(resolved.emailAddress).toContain("noreply@mail.sportclubevo.com");
  });

  it("treats UNKNOWN provider status as not usable", () => {
    expect(
      isSenderIdentityUsable({
        status: TenantCommunicationSenderIdentityStatus.ACTIVE,
        providerStatus: "UNKNOWN",
      }),
    ).toBe(false);
  });

  it("creates first sender as default", async () => {
    mocks.prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_A });
    mocks.prisma.tenantCommunicationSenderIdentity.count.mockResolvedValue(0);
    mocks.prisma.$transaction.mockImplementation(async (cb: (tx: typeof mocks.prisma) => unknown) =>
      cb(mocks.prisma),
    );
    mocks.prisma.tenantCommunicationSenderIdentity.create.mockResolvedValue({
      id: "new",
      tenantId: TENANT_A,
      displayName: "Junioren",
      emailAddress: "junioren@fcallschwil.ch",
      status: TenantCommunicationSenderIdentityStatus.ACTIVE,
      isDefault: true,
      scopeKind: "TENANT_WIDE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.prisma.tenant.updateMany.mockResolvedValue({ count: 1 });

    const created = await createTenantCommunicationSenderIdentity({
      tenantId: TENANT_A,
      actorUserId: "user-1",
      displayName: "Junioren",
      emailAddress: "junioren@fcallschwil.ch",
    });

    expect(created.isDefault).toBe(true);
    expect(mocks.prisma.tenantCommunicationSenderIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDefault: true }),
      }),
    );
  });
});
