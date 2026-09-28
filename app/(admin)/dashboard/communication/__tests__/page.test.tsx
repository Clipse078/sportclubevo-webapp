// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));

import CommunicationPage from "../page";
import { COMMUNICATION_HUB_ROUTE_PERMISSIONS } from "@/lib/communication/hub-access";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({
    user: { id: "user-1", activeTenantId: "tenant-1" },
  });
  mocks.getRequestEffectivePermissions.mockResolvedValue({
    platform: [],
    tenant: [PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
  });
});

describe("Kommunikation module landing page", () => {
  it("exposes operational hub destinations for authorized tenant admins", async () => {
    render(await CommunicationPage());

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(COMMUNICATION_HUB_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Kommunikation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kommunikationscenter öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/inbox",
    );
    expect(screen.getByRole("link", { name: /E-Mail-Absender öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/email-sender",
    );
    expect(screen.getByRole("link", { name: /Zielgruppen öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/zielgruppen",
    );
    expect(screen.getByRole("heading", { name: "Vorlagen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kommunikationscenter" })).toBeInTheDocument();
  });

  it("checks authorization before rendering the module shell", async () => {
    mocks.requireAnyPermission.mockRejectedValue(new Error("Forbidden"));
    await expect(CommunicationPage()).rejects.toThrow("Forbidden");
  });
});
