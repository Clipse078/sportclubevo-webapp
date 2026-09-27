// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const requirePermission = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: requirePermission,
}));

import CommunicationPage from "../page";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

beforeEach(() => {
  vi.clearAllMocks();
  requirePermission.mockResolvedValue(undefined);
});

describe("Kommunikation module landing page", () => {
  it("distinguishes the functional sender settings from future capabilities", async () => {
    render(await CommunicationPage());

    expect(requirePermission).toHaveBeenCalledWith([
      ...TENANT_ADMINISTRATION_PERMISSIONS,
      ...INBOX_VIEW_PERMISSIONS,
    ]);
    expect(screen.getByRole("heading", { level: 1, name: "Kommunikation" })).toBeInTheDocument();
    expect(screen.getByText(/Kommunikationscenter, Mitteilungen, Kampagnen/)).toBeInTheDocument();
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
