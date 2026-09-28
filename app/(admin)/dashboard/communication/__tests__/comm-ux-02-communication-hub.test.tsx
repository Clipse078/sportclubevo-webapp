// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

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
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { COMMUNICATION_HUB_ROUTE_PERMISSIONS } from "@/lib/communication/hub-access";
import { resolveCommunicationHubCapabilityAccess } from "@/lib/communication/hub-access";

const TENANT_ID = "tenant-test";

const VALID_HUB_HREFS = [
  "/dashboard/communication/inbox",
  "/dashboard/communication/mitteilungen",
  "/dashboard/communication/kampagnen",
  "/dashboard/communication/zielgruppen",
  "/dashboard/communication/vorlagen",
  "/dashboard/communication/email-sender",
  "/dashboard/communication/mitteilungen/new",
  "/dashboard/communication/kampagnen/new",
] as const;

function mockTenantPermissions(tenant: string[]) {
  mocks.getRequestEffectivePermissions.mockResolvedValue({
    platform: [],
    tenant,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({
    user: { id: "user-1", activeTenantId: TENANT_ID },
  });
  mockTenantPermissions([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS]);
});

describe("SCE-COMM-UX-02 Communication Hub redesign", () => {
  it("renders task-oriented hierarchy for tenant administrators", async () => {
    render(await CommunicationPage());

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(COMMUNICATION_HUB_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Kommunikation" })).toBeInTheDocument();
    expect(screen.getByText(/Mitgliedern, Teams und Partnern zentral steuern/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 2, name: "Kommunikationscenter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Kommunikation" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Organisation & Wiederverwendung" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Einstellungen" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Neue Mitteilung" })).toHaveAttribute(
      "href",
      "/dashboard/communication/mitteilungen/new",
    );
    expect(screen.getByRole("link", { name: "Neue Kampagne" })).toHaveAttribute(
      "href",
      "/dashboard/communication/kampagnen/new",
    );
  });

  it("removes catalogue noise: Modul im Aufbau, Verfügbar badges, and capability tags", async () => {
    render(await CommunicationPage());

    expect(screen.queryByText(/Modul im Aufbau/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Verfügbar$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unified Inbox/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/IMAP/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Empfängervorschau/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Neue Nachricht/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Persönliche Signaturen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Demnächst/i)).not.toBeInTheDocument();
  });

  it("shows send actions only with club send permission", async () => {
    mockTenantPermissions([PERMISSIONS.COMMUNICATION_CLUB_VIEW]);

    render(await CommunicationPage());

    expect(screen.queryByRole("link", { name: "Neue Mitteilung" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Neue Kampagne" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mitteilungen öffnen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kampagnen öffnen" })).toBeInTheDocument();
  });

  it("shows club capabilities with view permission and hides send CTAs", async () => {
    mockTenantPermissions([
      PERMISSIONS.COMMUNICATION_CLUB_VIEW,
      PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
      PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW,
    ]);

    render(await CommunicationPage());

    expect(screen.getByRole("link", { name: "Mitteilungen öffnen" })).toHaveAttribute(
      "href",
      "/dashboard/communication/mitteilungen",
    );
    expect(screen.getByRole("link", { name: "Kampagnen öffnen" })).toHaveAttribute(
      "href",
      "/dashboard/communication/kampagnen",
    );
    expect(screen.getByRole("link", { name: "Zielgruppen öffnen" })).toHaveAttribute(
      "href",
      "/dashboard/communication/zielgruppen",
    );
    expect(screen.getByRole("link", { name: "Vorlagen öffnen" })).toHaveAttribute(
      "href",
      "/dashboard/communication/vorlagen",
    );
    expect(screen.queryByRole("link", { name: /E-Mail-Absender öffnen/i })).not.toBeInTheDocument();
  });

  it("restricts inbox, club modules, and admin settings per canonical resolver", async () => {
    mockTenantPermissions([PERMISSIONS.COMMUNICATION_INBOX_VIEW]);

    render(await CommunicationPage());

    expect(screen.getByRole("link", { name: /Kommunikationscenter öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/inbox",
    );
    expect(screen.queryByRole("link", { name: /Mitteilungen öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Kampagnen öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Zielgruppen öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Vorlagen öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /E-Mail-Absender öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Kommunikation" })).not.toBeInTheDocument();
  });

  it("shows E-Mail-Absender only for tenant administration permission", async () => {
    mockTenantPermissions([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS]);

    render(await CommunicationPage());

    expect(screen.getByRole("link", { name: "E-Mail-Absender öffnen" })).toHaveAttribute(
      "href",
      "/dashboard/communication/email-sender",
    );
  });

  it("every rendered hub link targets a valid communication route", async () => {
    render(await CommunicationPage());

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/dashboard/communication"));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href");
      expect(href, `unexpected hub href: ${href}`).toBeTruthy();
      expect(VALID_HUB_HREFS.some((valid) => href === valid || href?.startsWith(`${valid}?`))).toBe(
        true,
      );
    }
  });

  it("uses accessible navigation names on capability cards", async () => {
    render(await CommunicationPage());

    const mitteilungen = screen.getByRole("link", { name: "Mitteilungen öffnen" });
    expect(within(mitteilungen).getByRole("heading", { name: "Mitteilungen" })).toBeInTheDocument();
    expect(within(mitteilungen).getByText(/Informationen gezielt an Mitglieder/)).toBeInTheDocument();
  });
});

describe("resolveCommunicationHubCapabilityAccess send alignment", () => {
  it("maps send flags to CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS", () => {
    const viewOnly = resolveCommunicationHubCapabilityAccess([PERMISSIONS.COMMUNICATION_CLUB_VIEW]);
    expect(viewOnly.mitteilungen).toBe(true);
    expect(viewOnly.kampagnen).toBe(true);
    expect(viewOnly.mitteilungenSend).toBe(false);
    expect(viewOnly.kampagnenSend).toBe(false);

    const sender = resolveCommunicationHubCapabilityAccess([PERMISSIONS.COMMUNICATION_CLUB_SEND]);
    expect(sender.mitteilungenSend).toBe(true);
    expect(sender.kampagnenSend).toBe(true);
  });
});
