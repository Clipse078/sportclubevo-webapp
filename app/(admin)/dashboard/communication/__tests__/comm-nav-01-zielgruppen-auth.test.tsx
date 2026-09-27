import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  getRequestEffectivePermissions: vi.fn(),
  getActiveTenant: vi.fn(),
  listZielgruppenForManagement: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));
vi.mock("@/lib/communication/zielgruppen/management-service", () => ({
  listZielgruppenForManagement: mocks.listZielgruppenForManagement,
}));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasPermission: mocks.hasPermission,
  }),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import CommunicationZielgruppenPage from "@/app/(admin)/dashboard/communication/zielgruppen/page";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const TENANT_ID = "tenant-fc-allschwil";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: "fc-allschwil-club-admin", activeTenantId: TENANT_ID },
  });
  mocks.getActiveTenant.mockResolvedValue({ id: TENANT_ID, key: "fc-allschwil" });
  mocks.listZielgruppenForManagement.mockResolvedValue([]);
  mocks.hasPermission.mockResolvedValue(false);
});

describe("COMM-NAV-01 zielgruppen route authorization", () => {
  it("allows tenant club admins that can open the Kommunikation hub to stay on Zielgruppen", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
    });

    await expect(
      CommunicationZielgruppenPage({ searchParams: Promise.resolve({}) }),
    ).resolves.toBeTruthy();

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.listZielgruppenForManagement).toHaveBeenCalled();
  });

  it("still redirects users without hub or zielgruppen access", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.USERS_VIEW],
    });

    await expect(CommunicationZielgruppenPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });
});
