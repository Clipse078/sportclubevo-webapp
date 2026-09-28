// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const requirePermission = vi.hoisted(() => vi.fn());
const getRequestEffectivePermissions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: requirePermission,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions,
}));

import CommunicationPage from "../page";
import { COMMUNICATION_HUB_ROUTE_PERMISSIONS } from "@/lib/communication/hub-access";
import { PERMISSIONS } from "@/lib/permissions/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  requirePermission.mockResolvedValue({
    user: { id: "user-1", activeTenantId: "tenant-1" },
  });
  getRequestEffectivePermissions.mockResolvedValue({
    platform: [],
    tenant: [
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    ],
  });
});

describe("Kommunikation module landing page", () => {
  it("distinguishes the functional sender settings from future capabilities", async () => {
    render(await CommunicationPage());

    expect(requirePermission).toHaveBeenCalledWith(COMMUNICATION_HUB_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Kommunikation" })).toBeInTheDocument();
    expect(screen.getByText(/sind einsatzbereit/)).toBeInTheDocument();
    expect(screen.queryByText(/Modul im Aufbau/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kommunikationscenter öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/inbox",
    );
    expect(screen.getByRole("link", { name: /Absender verwalten/ })).toHaveAttribute(
      "href",
      "/dashboard/communication/email-sender",
    );
    expect(screen.getByRole("heading", { name: "Zielgruppen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zielgruppen verwalten/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/zielgruppen",
    );
    expect(screen.getByRole("heading", { name: "Vorlagen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kommunikationscenter" })).toBeInTheDocument();
  });

  it("checks authorization before rendering the module shell", async () => {
    requirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(CommunicationPage()).rejects.toThrow("Forbidden");
  });
});
