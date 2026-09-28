import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenants: new Map<string, {
    id: string;
    emailSenderDisplayName: string | null;
    emailSenderAddress: string | null;
  }>(),
  tenantFindFirst: vi.fn(),
  tenantUpdateMany: vi.fn(),
  senderIdentityFindFirst: vi.fn(),
  senderIdentityCount: vi.fn(),
  senderIdentityCreate: vi.fn(),
  senderIdentityUpdate: vi.fn(),
  senderIdentityUpdateMany: vi.fn(),
  transaction: vi.fn(),
  providerAuthorization: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findFirst: mocks.tenantFindFirst,
      updateMany: mocks.tenantUpdateMany,
    },
    tenantCommunicationSenderIdentity: {
      findFirst: mocks.senderIdentityFindFirst,
      count: mocks.senderIdentityCount,
      create: mocks.senderIdentityCreate,
      update: mocks.senderIdentityUpdate,
      updateMany: mocks.senderIdentityUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/email/mailer", () => ({
  getSenderDomainAuthorization: mocks.providerAuthorization,
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

import {
  EmailSenderSettingsError,
  getTenantEmailSenderSettings,
  resolveTenantEmailSender,
  updateTenantEmailSenderSettings,
  validateTenantEmailSenderInput,
} from "@/lib/communication/email-sender-service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const PLATFORM_FROM = "SportClubEvo <noreply@mail.sportclubevo.com>";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_FROM = PLATFORM_FROM;
  mocks.tenants.clear();
  mocks.tenants.set(TENANT_A, {
    id: TENANT_A,
    emailSenderDisplayName: "FC Allschwil",
    emailSenderAddress: "info@fcallschwil.ch",
  });
  mocks.tenants.set(TENANT_B, {
    id: TENANT_B,
    emailSenderDisplayName: null,
    emailSenderAddress: null,
  });
  mocks.providerAuthorization.mockResolvedValue("VERIFIED");
  mocks.logAction.mockResolvedValue(undefined);
  mocks.tenantFindFirst.mockImplementation(
    async ({ where, select }: { where: { id: string }; select: Record<string, boolean> }) => {
      const tenant = mocks.tenants.get(where.id);
      if (!tenant) return null;
      return Object.fromEntries(
        Object.keys(select).map((key) => [key, tenant[key as keyof typeof tenant]]),
      );
    },
  );
  mocks.senderIdentityFindFirst.mockImplementation(async ({ where }: { where: { tenantId?: string; isDefault?: boolean; status?: string } }) => {
    const tenantId = where.tenantId;
    if (!tenantId) return null;
    const tenant = mocks.tenants.get(tenantId);
    if (!tenant?.emailSenderDisplayName || !tenant.emailSenderAddress) return null;
    return {
      id: `tcsi_legacy_${tenantId}`,
      tenantId,
      displayName: tenant.emailSenderDisplayName,
      emailAddress: tenant.emailSenderAddress.toLowerCase(),
      status: "ACTIVE",
      isDefault: true,
      scopeKind: "TENANT_WIDE",
    };
  });
  mocks.senderIdentityCount.mockResolvedValue(1);
  mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      tenantCommunicationSenderIdentity: {
        updateMany: mocks.senderIdentityUpdateMany,
        create: mocks.senderIdentityCreate,
        update: mocks.senderIdentityUpdate,
      },
      tenant: { updateMany: mocks.tenantUpdateMany },
    }),
  );
  mocks.senderIdentityUpdate.mockImplementation(async ({ data }: { data: Record<string, string> }) => ({
    id: "tcsi_legacy_tenant-a",
    tenantId: TENANT_A,
    displayName: data.displayName,
    emailAddress: data.emailAddress,
    status: "ACTIVE",
    isDefault: true,
    scopeKind: "TENANT_WIDE",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  mocks.senderIdentityCreate.mockResolvedValue({
    id: "tcsi_new",
    tenantId: TENANT_A,
    displayName: "Neuer Club",
    emailAddress: "mail@new-club.ch",
    status: "ACTIVE",
    isDefault: true,
    scopeKind: "TENANT_WIDE",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mocks.tenantUpdateMany.mockImplementation(
    async ({ where, data }: {
      where: { id: string };
      data: { emailSenderDisplayName: string; emailSenderAddress: string };
    }) => {
      const tenant = mocks.tenants.get(where.id);
      if (!tenant) return { count: 0 };
      mocks.tenants.set(where.id, { ...tenant, ...data });
      return { count: 1 };
    },
  );
});

describe("COMM-03B sender validation", () => {
  it("trims and normalizes a valid tenant sender", () => {
    expect(validateTenantEmailSenderInput({
      displayName: "  FC Allschwil  ",
      emailAddress: "  INFO@FCALLSCHWIL.CH ",
    })).toEqual({
      displayName: "FC Allschwil",
      emailAddress: "info@fcallschwil.ch",
    });
  });

  it.each([
    ["", "Absendername ist erforderlich."],
    [" \nBcc: attacker@example.com", "unzulässige Zeichen"],
    ["FC\u200BAllschwil", "unzulässige Zeichen"],
  ])("rejects unsafe display name %j", (displayName, message) => {
    expect(() => validateTenantEmailSenderInput({
      displayName,
      emailAddress: "info@fcallschwil.ch",
    })).toThrow(message);
  });

  it.each([
    "not-an-email",
    "info@fcallschwil.ch\r\nBcc: attacker@example.com",
    "Club <info@fcallschwil.ch>",
  ])("rejects unsafe sender email %j", (emailAddress) => {
    expect(() => validateTenantEmailSenderInput({
      displayName: "FC Allschwil",
      emailAddress,
    })).toThrow("gültige Absender-E-Mail");
  });
});

describe("COMM-03B tenant sender resolver", () => {
  it("returns a provider-usable tenant sender", async () => {
    await expect(resolveTenantEmailSender(TENANT_A)).resolves.toEqual({
      displayName: "FC Allschwil",
      emailAddress: "info@fcallschwil.ch",
      formattedFrom: "FC Allschwil <info@fcallschwil.ch>",
      source: "TENANT",
      providerStatus: "VERIFIED",
      senderIdentityId: "tcsi_legacy_tenant-a",
    });
  });

  it("uses the platform sender when no tenant sender is configured", async () => {
    await expect(resolveTenantEmailSender(TENANT_B)).resolves.toMatchObject({
      formattedFrom: PLATFORM_FROM,
      source: "PLATFORM",
      providerStatus: "NOT_CONFIGURED",
    });
    expect(mocks.providerAuthorization).not.toHaveBeenCalled();
  });

  it.each(["NOT_VERIFIED", "UNKNOWN"])(
    "uses platform fallback when tenant sender status is %s",
    async (providerStatus) => {
      mocks.providerAuthorization.mockResolvedValue(providerStatus);
      await expect(resolveTenantEmailSender(TENANT_A)).resolves.toMatchObject({
        formattedFrom: PLATFORM_FROM,
        source: "PLATFORM",
        providerStatus,
      });
    },
  );

  it("never returns Tenant A settings for Tenant B", async () => {
    const settings = await getTenantEmailSenderSettings(TENANT_B);
    expect(settings.displayName).toBeNull();
    expect(settings.emailAddress).toBeNull();
    expect(mocks.tenantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TENANT_B } }),
    );
  });
});

describe("COMM-03B tenant sender update", () => {
  it("updates only the authoritative tenant and records a tenant audit", async () => {
    await updateTenantEmailSenderSettings({
      tenantId: TENANT_A,
      actorUserId: "admin-a",
      displayName: " Neuer Club ",
      emailAddress: " MAIL@NEW-CLUB.CH ",
    });

    expect(mocks.senderIdentityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: "Neuer Club",
          emailAddress: "mail@new-club.ch",
        }),
      }),
    );
    expect(mocks.tenants.get(TENANT_B)).toMatchObject({
      emailSenderDisplayName: null,
      emailSenderAddress: null,
    });
    expect(mocks.tenantUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TENANT_A } }),
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        actorUserId: "admin-a",
        action: "UPDATE",
      }),
    );
  });

  it("does not create or update an unknown tenant", async () => {
    await expect(updateTenantEmailSenderSettings({
      tenantId: "tenant-missing",
      actorUserId: "admin-a",
      displayName: "Missing",
      emailAddress: "mail@missing.ch",
    })).rejects.toBeInstanceOf(EmailSenderSettingsError);
    expect(mocks.tenantUpdateMany).not.toHaveBeenCalled();
  });
});
