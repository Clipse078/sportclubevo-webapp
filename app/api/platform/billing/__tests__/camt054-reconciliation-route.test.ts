import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  reconcileCamt054Statement: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));
vi.mock("@/lib/security/platform-superadmin", () => ({
  isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

vi.mock("@/lib/billing/camt054-reconciliation/camt054-reconciliation-service", () => ({
  reconcileCamt054Statement: mocks.reconcileCamt054Statement,
}));

vi.mock("@/lib/billing/camt054-reconciliation/camt054-reconciliation-serializers", () => ({
  serializeCamt054ReconciliationReport: (report: unknown) => report,
}));

const { POST } = await import("../legal-entities/[key]/camt054-reconciliation/route");

describe("camt054 reconciliation route (SWISS-01H)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: true,
      actorUserId: "user-1",
    });
    mocks.isPlatformSuperAdmin.mockResolvedValue(true);
    mocks.reconcileCamt054Statement.mockResolvedValue({
      legalEntityKey: "issuer",
      dryRun: true,
      appliedCount: 0,
      skippedCount: 0,
      entries: [],
    });
  });

  it("requires BILLING_MANAGE", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      error: "Forbidden",
      status: 403,
    });
    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: "<xml/>" }),
      }),
      { params: Promise.resolve({ key: "issuer" }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(
      PERMISSIONS.BILLING_MANAGE,
    );
  });

  it("passes dryRun and xml to reconciliation service", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: "<xml/>", dryRun: true }),
      }),
      { params: Promise.resolve({ key: "issuer" }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.reconcileCamt054Statement).toHaveBeenCalledWith(
      expect.objectContaining({
        legalEntityKey: "issuer",
        xml: "<xml/>",
        dryRun: true,
        actorUserId: "user-1",
        contentSha256: expect.any(String),
      }),
    );
  });

  it("requires a Platform Superadmin for uploads", async () => {
    mocks.isPlatformSuperAdmin.mockResolvedValue(false);
    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ xml: "<xml/>", dryRun: true }),
      }),
      { params: Promise.resolve({ key: "issuer" }) },
    );
    expect(res.status).toBe(403);
    expect(mocks.reconcileCamt054Statement).not.toHaveBeenCalled();
  });

  it("rejects execution without confirmation of the exact file hash", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({
          xml: "<xml/>",
          filename: "statement.xml",
          dryRun: false,
          confirmedContentSha256: "wrong",
        }),
      }),
      { params: Promise.resolve({ key: "issuer" }) },
    );
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      code: "CAMT054_CONFIRMATION_HASH_MISMATCH",
    });
    expect(mocks.reconcileCamt054Statement).not.toHaveBeenCalled();
  });
});
