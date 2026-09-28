// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  listCampaigns: vi.fn(),
  resolveCampaignAuthorization: vi.fn(),
  requireCampaignSend: vi.fn(),
  getCampaignById: vi.fn(),
  getCommunicationDeliveryAnalytics: vi.fn(),
  listCommunicationDeliveryDetail: vi.fn(),
  listZielgruppenForManagement: vi.fn(),
  resolvePlatformTemplateAuthorization: vi.fn(),
  listPlatformCommunicationTemplates: vi.fn(),
  resolveSponsorAudienceAuthorization: vi.fn(),
  prismaSponsorFindMany: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));
vi.mock("@/lib/communication/campaign/campaign-service", () => ({
  listCampaigns: mocks.listCampaigns,
  getCampaignById: mocks.getCampaignById,
}));
vi.mock("@/lib/communication/campaign/campaign-authorization", () => ({
  resolveCampaignAuthorization: mocks.resolveCampaignAuthorization,
  requireCampaignSend: mocks.requireCampaignSend,
}));
vi.mock("@/lib/communication/analytics/communication-delivery-analytics-service", () => ({
  getCommunicationDeliveryAnalytics: mocks.getCommunicationDeliveryAnalytics,
  listCommunicationDeliveryDetail: mocks.listCommunicationDeliveryDetail,
}));
vi.mock("@/lib/communication/zielgruppen/management-service", () => ({
  listZielgruppenForManagement: mocks.listZielgruppenForManagement,
}));
vi.mock("@/lib/communication/templates/platform-template-authorization", () => ({
  resolvePlatformTemplateAuthorization: mocks.resolvePlatformTemplateAuthorization,
}));
vi.mock("@/lib/communication/templates/platform-template-service", () => ({
  listPlatformCommunicationTemplates: mocks.listPlatformCommunicationTemplates,
}));
vi.mock("@/lib/sponsoring/sponsor-authorization", () => ({
  resolveSponsorAudienceAuthorization: mocks.resolveSponsorAudienceAuthorization,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    sponsorOrganisation: { findMany: mocks.prismaSponsorFindMany },
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import CampaignListPage from "../kampagnen/page";
import NewCampaignPage from "../kampagnen/new/page";
import CampaignDetailPage from "../kampagnen/[id]/page";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";
import CommunicationDeliveryAnalyticsPanel from "@/components/admin/communication/analytics/CommunicationDeliveryAnalyticsPanel";
import {
  CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS,
  CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/club/route-access";
import {
  KAMPAGNE_PREFERENCES_NOTICE,
  KAMPAGNE_SAFEGUARDING_NOTICE,
  KAMPAGNE_SPONSOR_COMMERCIAL_NOTICE,
  resolveKampagnenDisplayStatus,
} from "@/lib/communication/campaign/kampagnen-display";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const TENANT_ID = "tenant-kampagnen-ux";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const sampleCampaign = {
  id: "camp-1",
  internalName: "Frühjahr 2026",
  status: "PUBLISHED",
  subject: "Mitgliederinfo Frühjahr",
  bodyText: "Liebe Mitglieder, …",
  audienceSummary: "Ganzer Verein",
  authorPerson: { id: "p1", firstName: "Anna", lastName: "Admin" },
  createdAt: "2026-09-19T08:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  publishedAt: "2026-09-20T10:00:00.000Z",
  recipientCount: 120,
  deliverySnapshotCount: 120,
  scheduleStatus: null,
  scheduledAt: null,
  channelSummary: "In-App, Push, E-Mail",
  createdByUserId: "user-1",
  audienceSpec: {
    composition: "UNION" as const,
    components: [{ structural: { wholeOrganisation: true } }],
  },
  orchestration: {
    schemaVersion: 1 as const,
    channels: { inApp: true, push: true, email: true },
    scheduling: { mode: "IMMEDIATE" as const, scheduledAt: null },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({
    user: { id: "user-1", activeTenantId: TENANT_ID },
  });
  mocks.requireCampaignSend.mockResolvedValue(undefined);
  mocks.getActiveTenant.mockResolvedValue({
    id: TENANT_ID,
    key: "fc-test",
    timezone: "Europe/Zurich",
  });
  mocks.resolveCampaignAuthorization.mockResolvedValue({
    canSend: true,
    canViewEngagementDetail: true,
  });
  mocks.listCampaigns.mockResolvedValue([]);
  mocks.listZielgruppenForManagement.mockResolvedValue([
    { id: "tg-1", name: "Trainer Junioren", status: "ACTIVE" },
  ]);
  mocks.getCampaignById.mockResolvedValue(sampleCampaign);
  mocks.getCommunicationDeliveryAnalytics.mockResolvedValue({
    publication: { deliveryAnalyticsApplicable: true, scheduleStatus: null, scheduledAt: null },
    audience: {
      targetSubjectCount: 120,
      recipientSnapshotCount: 120,
      deliveryIdentityCount: 115,
    },
    channels: {
      inApp: { applicable: true, available: 120, unread: 40, read: 70, acknowledged: 10, responded: 2 },
      push: { applicable: true, deviceAttempts: 80, recipientIdentities: 75, outcomes: { pending: 0, processing: 0, sent: 70, failed: 2, skipped: 8 } },
      email: { applicable: true, pending: 0, processing: 0, sent: 100, failed: 3, skipped: 5 },
    },
    engagement: {
      inApp: { read: 70, unread: 40, acknowledged: 10, responded: 2 },
      acknowledgementRequired: false,
      typeSpecific: { pollResponseCount: null, pollOutstandingCount: null, requestClaimCount: null, requestOutstandingCount: null },
    },
    issues: {
      emailFailed: 3,
      emailSkipped: 5,
      pushFailed: 2,
      pushSkipped: 8,
      skipReasons: { preferenceDisabled: 4, consentRequired: 2, noEligibleDeliveryIdentity: 1 },
    },
    safeguarding: { guardianExpandedDeliveries: 6, guardianUnavailableExclusions: 0 },
    truthStatement: "Subjekte ≠ Zustell-Identitäten.",
  });
  mocks.listCommunicationDeliveryDetail.mockResolvedValue({ items: [] });
  mocks.resolvePlatformTemplateAuthorization.mockResolvedValue({ canView: true, canManage: true });
  mocks.listPlatformCommunicationTemplates.mockResolvedValue([
    { id: "tpl-1", name: "Standard Kampagne", kind: "CAMPAIGN", status: "ACTIVE" },
  ]);
  mocks.resolveSponsorAudienceAuthorization.mockResolvedValue({ canViewSponsorData: true });
  mocks.prismaSponsorFindMany.mockResolvedValue([]);
  global.fetch = mocks.fetch as unknown as typeof fetch;
  mocks.fetch.mockResolvedValue(
    new Response(JSON.stringify({ readiness: { ready: true } }), { status: 200 }),
  );
});

describe("SCE-COMM-UX-05 Kampagnen workspace", () => {
  it("overview renders workspace header and description", async () => {
    render(await CampaignListPage({ searchParams: Promise.resolve({}) }));
    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Kampagnen" })).toBeInTheDocument();
    expect(screen.getByText(/Geplante organisationsweite Kommunikation/)).toBeInTheDocument();
  });

  it("empty state offers Neue Kampagne for senders", async () => {
    render(await CampaignListPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Noch keine Kampagnen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neue Kampagne" })).toHaveAttribute(
      "href",
      "/dashboard/communication/kampagnen/new",
    );
  });

  it("hides Neue Kampagne without send permission", async () => {
    mocks.resolveCampaignAuthorization.mockResolvedValue({ canSend: false });
    mocks.listCampaigns.mockResolvedValue([sampleCampaign]);
    render(await CampaignListPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("link", { name: "Neue Kampagne" })).not.toBeInTheDocument();
  });

  it("maps lifecycle labels including Geplant and Bereit", () => {
    expect(resolveKampagnenDisplayStatus({ status: "DRAFT" }).label).toBe("Entwurf");
    expect(resolveKampagnenDisplayStatus({ status: "READY" }).label).toBe("Bereit");
    expect(resolveKampagnenDisplayStatus({ status: "PUBLISHED" }).label).toBe("Veröffentlicht");
    expect(
      resolveKampagnenDisplayStatus({ status: "DRAFT", scheduleStatus: "SCHEDULED" }).label,
    ).toBe("Geplant");
    expect(
      resolveKampagnenDisplayStatus({ status: "READY", scheduleStatus: "PROCESSING" }).label,
    ).toBe("Wird versendet");
  });

  it("list shows channels, creator, and delivery summary", async () => {
    mocks.listCampaigns.mockResolvedValue([sampleCampaign]);
    render(await CampaignListPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("link", { name: "Mitgliederinfo Frühjahr" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Anna Admin")).toBeInTheDocument();
    expect(screen.getByText("120 Zustellungen")).toBeInTheDocument();
    expect(screen.getByText("In-App, Push, E-Mail")).toBeInTheDocument();
  });

  it("passes search and status filters to listCampaigns", async () => {
    await CampaignListPage({
      searchParams: Promise.resolve({ q: "Frühjahr", status: "PUBLISHED", mine: "1" }),
    });
    expect(mocks.listCampaigns).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "Frühjahr",
        status: "PUBLISHED",
        createdByUserId: "user-1",
      }),
    );
  });

  it("shows filtered empty state", async () => {
    mocks.listCampaigns.mockResolvedValue([]);
    render(await CampaignListPage({ searchParams: Promise.resolve({ q: "xyz" }) }));
    expect(screen.getByText("Keine Kampagnen gefunden")).toBeInTheDocument();
  });

  it("new page requires send permissions", async () => {
    render(await NewCampaignPage({ searchParams: Promise.resolve({}) }));
    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS);
    expect(mocks.requireCampaignSend).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Neue Kampagne" })).toBeInTheDocument();
  });

  it("composer exposes sequential sections and publish actions", () => {
    render(
      <CampaignComposer
        targetGroups={[{ id: "tg-1", name: "Trainer Junioren", status: "ACTIVE" }]}
        templateOptions={[{ id: "tpl-1", name: "Standard Kampagne" }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Inhalt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Empfänger" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Kanäle" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Zeitpunkt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Überprüfen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt veröffentlichen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entwurf speichern" })).toBeInTheDocument();
    expect(screen.getByText(KAMPAGNE_PREFERENCES_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(KAMPAGNE_SAFEGUARDING_NOTICE)).toBeInTheDocument();
  });

  it("composer supports Zielgruppe preview via campaign preview API", async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: 50,
          effective: 42,
          excluded: 8,
          scopeNotice: null,
        }),
        { status: 200 },
      ),
    );
    render(
      <CampaignComposer
        targetGroups={[{ id: "tg-1", name: "Trainer Junioren", status: "ACTIVE" }]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Gespeicherte Zielgruppen"));
    fireEvent.click(screen.getByRole("button", { name: "Trainer Junioren" }));
    fireEvent.click(screen.getByRole("button", { name: "Empfängervorschau" }));
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/communication/campaign/preview",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows sponsor commercial notice in sponsor audience mode", () => {
    render(
      <CampaignComposer
        targetGroups={[]}
        sponsorOrganisations={[
          {
            id: "s1",
            name: "Hauptsponsor AG",
            contacts: [{ id: "c1", displayName: "Max Sponsor", isPrimary: true }],
          },
        ]}
        initialAudienceMode="SPONSORS"
      />,
    );
    expect(screen.getByText(KAMPAGNE_SPONSOR_COMMERCIAL_NOTICE)).toBeInTheDocument();
  });

  it("requires review confirmation before publish", async () => {
    render(
      <CampaignComposer
        targetGroups={[{ id: "tg-1", name: "Trainer Junioren", status: "ACTIVE" }]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nachricht"), { target: { value: "Hallo Verein" } });
    fireEvent.change(screen.getByLabelText("Interner Name"), { target: { value: "Test Kampagne" } });
    fireEvent.click(screen.getByRole("button", { name: "Jetzt veröffentlichen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Zusammenfassung/);
  });

  it("detail page shows overview, historical audience, analytics without email opens", async () => {
    render(await CampaignDetailPage({ params: Promise.resolve({ id: "camp-1" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Mitgliederinfo Frühjahr" })).toBeInTheDocument();
    expect(screen.getByText("Anna Admin")).toBeInTheDocument();
    expect(screen.getByText(/Historischer Snapshot/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Zustellung & Reaktionen" })).toBeInTheDocument();
    expect(screen.queryByText(/E-Mail.*Gelesen/i)).not.toBeInTheDocument();
    expect(screen.getByText(/keine Öffnungs- oder Lese-Analytics/i)).toBeInTheDocument();
  });

  it("gates recipient detail on engagement permission", async () => {
    mocks.resolveCampaignAuthorization.mockResolvedValue({
      canSend: true,
      canViewEngagementDetail: false,
    });
    render(await CampaignDetailPage({ params: Promise.resolve({ id: "camp-1" }) }));
    expect(mocks.listCommunicationDeliveryDetail).not.toHaveBeenCalled();
  });

  it("mobile list uses card semantics not table-only", () => {
    const source = readRelative("app/(admin)/dashboard/communication/kampagnen/page.tsx");
    expect(source).toContain("md:hidden");
    expect(source).toContain("hidden overflow-x-auto md:block");
  });

  it("send route permissions align with canonical keys", () => {
    expect(CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS).toContain(PERMISSIONS.COMMUNICATION_CLUB_SEND);
  });

  it("analytics panel surfaces skip reasons", () => {
    render(
      <CommunicationDeliveryAnalyticsPanel
        analytics={{
          publication: { deliveryAnalyticsApplicable: true, scheduleStatus: null, scheduledAt: null },
          audience: { targetSubjectCount: 1, recipientSnapshotCount: 1, deliveryIdentityCount: 1 },
          channels: {
            inApp: { applicable: true, available: 1, unread: 0, read: 1, acknowledged: 0, responded: 0 },
            push: { applicable: false, deviceAttempts: 0, recipientIdentities: 0, outcomes: { pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0 } },
            email: { applicable: false, pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0 },
          },
          engagement: {
            inApp: { read: 1, unread: 0, acknowledged: 0, responded: 0 },
            acknowledgementRequired: false,
            typeSpecific: { pollResponseCount: null, pollOutstandingCount: null, requestClaimCount: null, requestOutstandingCount: null },
          },
          issues: {
            emailFailed: 0,
            emailSkipped: 2,
            pushFailed: 0,
            pushSkipped: 0,
            skipReasons: { preferenceDisabled: 1, consentRequired: 1, noEligibleDeliveryIdentity: 0 },
          },
          safeguarding: { guardianExpandedDeliveries: 1, guardianUnavailableExclusions: 0 },
          truthStatement: "test",
        }}
      />,
    );
    expect(screen.getByText(/Präferenz deaktiviert/)).toBeInTheDocument();
  });
});
