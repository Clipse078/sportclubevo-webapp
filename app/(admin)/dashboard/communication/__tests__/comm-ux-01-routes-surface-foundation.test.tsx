// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";

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
  listClubCommunications: vi.fn(),
  listCampaigns: vi.fn(),
  listUpcomingPublicationSchedules: vi.fn(),
  listPlatformCommunicationTemplates: vi.fn(),
  resolveClubCommunicationAuthorization: vi.fn(),
  resolveCampaignAuthorization: vi.fn(),
  resolvePlatformTemplateAuthorization: vi.fn(),
  requireAnyPermission: vi.fn(),
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
vi.mock("@/lib/communication/club/club-communication-service", () => ({
  listClubCommunications: mocks.listClubCommunications,
}));
vi.mock("@/lib/communication/campaign/campaign-service", () => ({
  listCampaigns: mocks.listCampaigns,
}));
vi.mock("@/lib/communication/scheduling/publication-schedule-service", () => ({
  listUpcomingPublicationSchedules: mocks.listUpcomingPublicationSchedules,
}));
vi.mock("@/lib/communication/templates/platform-template-service", () => ({
  listPlatformCommunicationTemplates: mocks.listPlatformCommunicationTemplates,
}));
vi.mock("@/lib/communication/club/club-communication-authorization", () => ({
  resolveClubCommunicationAuthorization: mocks.resolveClubCommunicationAuthorization,
}));
vi.mock("@/lib/communication/campaign/campaign-authorization", () => ({
  resolveCampaignAuthorization: mocks.resolveCampaignAuthorization,
}));
vi.mock("@/lib/communication/templates/platform-template-authorization", () => ({
  resolvePlatformTemplateAuthorization: mocks.resolvePlatformTemplateAuthorization,
}));
vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasPermission: mocks.hasPermission,
  }),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import ClubMitteilungenPage from "../mitteilungen/page";
import CampaignListPage from "../kampagnen/page";
import CommunicationTemplatesPage from "../vorlagen/page";
import CommunicationPage from "../page";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/club/route-access";
import { PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/templates/route-access";
import { COMMUNICATION_HUB_ROUTE_PERMISSIONS } from "@/lib/communication/hub-access";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";

const TENANT_ID = "tenant-fc-allschwil";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({
    user: { id: "fc-allschwil-club-admin", activeTenantId: TENANT_ID },
  });
  mocks.getActiveTenant.mockResolvedValue({ id: TENANT_ID, key: "fc-allschwil", timezone: "Europe/Zurich" });
  mocks.listClubCommunications.mockResolvedValue([]);
  mocks.listCampaigns.mockResolvedValue([]);
  mocks.listUpcomingPublicationSchedules.mockResolvedValue([]);
  mocks.listPlatformCommunicationTemplates.mockResolvedValue([]);
  mocks.resolveClubCommunicationAuthorization.mockResolvedValue({ canSend: true });
  mocks.resolveCampaignAuthorization.mockResolvedValue({ canSend: true });
  mocks.resolvePlatformTemplateAuthorization.mockResolvedValue({ canManage: true, canView: true });
  mocks.getRequestEffectivePermissions.mockResolvedValue({
    platform: [],
    tenant: [PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
  });
});

describe("SCE-COMM-UX-01 route authorization alignment", () => {
  it("allows tenant club admins to open Mitteilungen without redirect", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
    });

    render(await ClubMitteilungenPage({ searchParams: Promise.resolve({}) }));

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Mitteilungen" })).toBeInTheDocument();
    expect(screen.getByText("Noch keine Mitteilungen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neue Mitteilung" })).toHaveAttribute(
      "href",
      "/dashboard/communication/mitteilungen/new",
    );
  });

  it("allows tenant club admins to open Kampagnen without redirect", async () => {
    render(await CampaignListPage({ searchParams: Promise.resolve({}) }));

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Kampagnen" })).toBeInTheDocument();
    expect(screen.getByText("Noch keine Kampagnen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neue Kampagne" })).toHaveAttribute(
      "href",
      "/dashboard/communication/kampagnen/new",
    );
  });

  it("allows tenant club admins to open Vorlagen without redirect", async () => {
    render(await CommunicationTemplatesPage());

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Vorlagen" })).toBeInTheDocument();
    expect(screen.getByText("Noch keine Vorlagen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neue Vorlage" })).toHaveAttribute(
      "href",
      "/dashboard/communication/vorlagen/new",
    );
  });

  it("hub CTAs point to valid destinations for tenant admins", async () => {
    render(await CommunicationPage());

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(COMMUNICATION_HUB_ROUTE_PERMISSIONS);
    expect(screen.queryByText(/Modul im Aufbau/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/COMM-\d+/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mitteilungen öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/mitteilungen",
    );
    expect(screen.getByRole("link", { name: /Kampagnen öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/kampagnen",
    );
    expect(screen.getByRole("link", { name: /Vorlagen öffnen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/vorlagen",
    );
  });

  it("does not expose hub CTAs when the user lacks destination permissions", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_INBOX_VIEW],
    });

    render(await CommunicationPage());

    expect(screen.queryByRole("link", { name: /Mitteilungen öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Kampagnen öffnen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Vorlagen öffnen/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kommunikationscenter öffnen/i })).toBeInTheDocument();
  });
});

describe("SCE-COMM-UX-01 UX foundation primitives", () => {
  it("uses shared communication header and content surface on list routes", () => {
    const mitteilungen = readRelative("app/(admin)/dashboard/communication/mitteilungen/page.tsx");
    expect(mitteilungen).toContain("CommunicationWorkspaceHeader");
    expect(mitteilungen).toContain("CommunicationContentSurface");
    expect(readRelative("components/admin/communication/shared/CommunicationContentSurface.tsx")).toContain(
      "SCE_SURFACE_STANDARD_PANEL",
    );
    expect(SCE_SURFACE_STANDARD_PANEL).toContain("var(--sce-surface-standard)");
  });

  it("applies module page surface at communication layout root", () => {
    const layout = readRelative("app/(admin)/dashboard/communication/layout.tsx");
    expect(layout).toContain("SCE_DASHBOARD_MODULE_PAGE_SURFACE");
  });
});
