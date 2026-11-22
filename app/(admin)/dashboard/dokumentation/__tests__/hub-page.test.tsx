/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  resolveTenantDocumentationHubRouteAccess: vi.fn(),
  getActiveTenant: vi.fn(),
  ensureDefaultSpace: vi.fn(),
  findFirst: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/tenant-documentation/route-access", () => ({
  resolveTenantDocumentationHubRouteAccess: mocks.resolveTenantDocumentationHubRouteAccess,
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));

vi.mock("@/lib/tenant-documentation/page-tree-service", () => ({
  ensureDefaultSpace: mocks.ensureDefaultSpace,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantDocumentationPage: { findFirst: mocks.findFirst },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));

import TenantDocumentationHubPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TenantDocumentationHubPage", () => {
  it("renders explicit forbidden state instead of redirecting to /dashboard", async () => {
    mocks.resolveTenantDocumentationHubRouteAccess.mockResolvedValue({ kind: "forbidden" });

    const ui = await TenantDocumentationHubPage();
    render(ui);

    expect(screen.getByTestId("tenant-documentation-unauthorized")).toHaveAttribute(
      "data-reason",
      "forbidden",
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects to login for unauthenticated access", async () => {
    mocks.resolveTenantDocumentationHubRouteAccess.mockResolvedValue({ kind: "unauthenticated" });

    await expect(TenantDocumentationHubPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to first page when access is granted", async () => {
    mocks.resolveTenantDocumentationHubRouteAccess.mockResolvedValue({
      kind: "granted",
      actorUserId: "user-1",
      tenantId: "tenant-1",
      permissionKeys: [],
      session: { user: { id: "user-1" } },
    });
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1" });
    mocks.findFirst.mockResolvedValue({ id: "page-first" });

    await expect(TenantDocumentationHubPage()).rejects.toThrow(
      "REDIRECT:/dashboard/dokumentation/p/page-first",
    );
  });
});