// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  requireClubCommunicationSend: vi.fn(),
  getActiveTenant: vi.fn(),
  listClubCommunications: vi.fn(),
  listZielgruppenForManagement: vi.fn(),
  resolveClubCommunicationAuthorization: vi.fn(),
  getClubCommunicationById: vi.fn(),
  getCommunicationDeliveryAnalytics: vi.fn(),
  listCommunicationDeliveryDetail: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));
vi.mock("@/lib/communication/club/club-communication-service", () => ({
  listClubCommunications: mocks.listClubCommunications,
  getClubCommunicationById: mocks.getClubCommunicationById,
}));
vi.mock("@/lib/communication/club/club-communication-authorization", () => ({
  resolveClubCommunicationAuthorization: mocks.resolveClubCommunicationAuthorization,
  requireClubCommunicationSend: mocks.requireClubCommunicationSend,
}));
vi.mock("@/lib/communication/zielgruppen/management-service", () => ({
  listZielgruppenForManagement: mocks.listZielgruppenForManagement,
}));
vi.mock("@/lib/communication/analytics/communication-delivery-analytics-service", () => ({
  getCommunicationDeliveryAnalytics: mocks.getCommunicationDeliveryAnalytics,
  listCommunicationDeliveryDetail: mocks.listCommunicationDeliveryDetail,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import ClubMitteilungenPage from "../mitteilungen/page";
import NewMitteilungPage from "../mitteilungen/new/page";
import MitteilungDetailPage from "../mitteilungen/[id]/page";
import ClubCommunicationComposer from "@/components/admin/communication/club/ClubCommunicationComposer";
import CommunicationDeliveryAnalyticsPanel from "@/components/admin/communication/analytics/CommunicationDeliveryAnalyticsPanel";
import {
  CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS,
  CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/club/route-access";
import {
  MITTEILUNG_SAFEGUARDING_NOTICE,
  resolveMitteilungDisplayStatus,
} from "@/lib/communication/club/mitteilungen-display";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const TENANT_ID = "tenant-mitteilungen-ux";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const sampleItem = {
  id: "comm-1",
  kind: "ANNOUNCEMENT" as const,
  status: "PUBLISHED",
  bodyText: "Training findet wie geplant statt.",
  subject: "Training Dienstag",
  acknowledgementRequired: false,
  publishedAt: "2026-09-20T10:00:00.000Z",
  createdAt: "2026-09-19T08:00:00.000Z",
  audienceSummary: "Ganzer Verein",
  senderPerson: { id: "p1", firstName: "Anna", lastName: "Admin", displayName: null },
  scheduleStatus: null,
  scheduledAt: null,
  deliverySnapshotCount: 42,
  audienceSpec: {
    composition: "UNION" as const,
    components: [{ structural: { wholeOrganisation: true } }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({
    user: { id: "user-1", activeTenantId: TENANT_ID },
  });
  mocks.requireClubCommunicationSend.mockResolvedValue(undefined);
  mocks.getActiveTenant.mockResolvedValue({
    id: TENANT_ID,
    key: "fc-test",
    timezone: "Europe/Zurich",
  });
  mocks.resolveClubCommunicationAuthorization.mockResolvedValue({
    canSend: true,
    canViewEngagementDetail: true,
  });
  mocks.listClubCommunications.mockResolvedValue([]);
  mocks.listZielgruppenForManagement.mockResolvedValue([
    { id: "tg-1", name: "Aktive Mitglieder", status: "ACTIVE" },
  ]);
  mocks.getClubCommunicationById.mockResolvedValue(sampleItem);
  mocks.getCommunicationDeliveryAnalytics.mockResolvedValue({
    publication: { deliveryAnalyticsApplicable: true, scheduleStatus: null, scheduledAt: null },
    audience: {
      targetSubjectCount: 42,
      recipientSnapshotCount: 42,
      deliveryIdentityCount: 40,
    },
    channels: {
      inApp: { applicable: true, available: 42, unread: 10, read: 24, acknowledged: 8, responded: 3 },
      push: { applicable: false, deviceAttempts: 0, recipientIdentities: 0, outcomes: { pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0 } },
      email: { applicable: true, pending: 0, processing: 0, sent: 38, failed: 0, skipped: 4 },
    },
    engagement: {
      inApp: { read: 24, unread: 10, acknowledged: 8, responded: 3 },
      acknowledgementRequired: false,
      typeSpecific: { pollResponseCount: null, pollOutstandingCount: null, requestClaimCount: null, requestOutstandingCount: null },
    },
    issues: {
      emailFailed: 0,
      emailSkipped: 4,
      pushFailed: 0,
      pushSkipped: 0,
      skipReasons: { preferenceDisabled: 2, consentRequired: 1, noEligibleDeliveryIdentity: 1 },
    },
    safeguarding: { guardianExpandedDeliveries: 5, guardianUnavailableExclusions: 0 },
    truthStatement: "Subjekte ≠ Zustell-Identitäten.",
  });
  mocks.listCommunicationDeliveryDetail.mockResolvedValue({ items: [] });
  global.fetch = mocks.fetch as unknown as typeof fetch;
  mocks.fetch.mockResolvedValue(
    new Response(JSON.stringify({ readiness: { ready: true } }), { status: 200 }),
  );
});

describe("SCE-COMM-UX-04 Mitteilungen redesign", () => {
  it("authorized overview renders COMM-UX-01 shell", async () => {
    render(await ClubMitteilungenPage({ searchParams: Promise.resolve({}) }));

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Mitteilungen" })).toBeInTheDocument();
    expect(
      screen.getByText(/Operative Vereinsinformationen an definierte Zielgruppen/),
    ).toBeInTheDocument();
  });

  it("shows empty state and Neue Mitteilung for senders", async () => {
    render(await ClubMitteilungenPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Noch keine Mitteilungen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neue Mitteilung" })).toHaveAttribute(
      "href",
      "/dashboard/communication/mitteilungen/new",
    );
  });

  it("hides Neue Mitteilung without send permission on list toolbar", async () => {
    mocks.resolveClubCommunicationAuthorization.mockResolvedValue({ canSend: false });
    mocks.listClubCommunications.mockResolvedValue([sampleItem]);
    render(await ClubMitteilungenPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole("link", { name: "Neue Mitteilung" })).not.toBeInTheDocument();
  });

  it("maps lifecycle status to German product copy including Geplant", () => {
    expect(resolveMitteilungDisplayStatus({ status: "DRAFT" }).label).toBe("Entwurf");
    expect(resolveMitteilungDisplayStatus({ status: "PUBLISHED" }).label).toBe("Gesendet");
    expect(
      resolveMitteilungDisplayStatus({ status: "DRAFT", scheduleStatus: "SCHEDULED" }).label,
    ).toBe("Geplant");
  });

  it("renders list hierarchy with creator display name and delivery summary", async () => {
    mocks.listClubCommunications.mockResolvedValue([sampleItem]);
    render(await ClubMitteilungenPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("link", { name: "Training Dienstag" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Anna Admin")).toBeInTheDocument();
    expect(screen.getByText("42 Zustellungen")).toBeInTheDocument();
    expect(screen.getAllByText("Gesendet").length).toBeGreaterThan(0);
  });

  it("new page requires send route permissions", async () => {
    render(await NewMitteilungPage());
    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS);
    expect(mocks.requireClubCommunicationSend).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Neue Mitteilung" })).toBeInTheDocument();
  });

  it("composer exposes content, audience, channels, timing, and review sections", () => {
    render(
      <ClubCommunicationComposer
        targetGroups={[{ id: "tg-1", name: "Aktive Mitglieder", status: "ACTIVE" }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Inhalt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Empfänger" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Kanäle" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Zeitpunkt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Überprüfen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mitteilung senden" })).toBeInTheDocument();
    expect(screen.getByText(MITTEILUNG_SAFEGUARDING_NOTICE)).toBeInTheDocument();
    expect(screen.getByText("In-App")).toBeInTheDocument();
    expect(screen.getByText("Push")).toBeInTheDocument();
    expect(screen.getByText("E-Mail (wenn verfügbar)")).toBeInTheDocument();
  });

  it("composer supports saved Zielgruppen and preview API", async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: 50,
          effective: 42,
          excluded: 8,
          scopeNotice: null,
          audienceSummary: "1 Zielgruppe",
        }),
        { status: 200 },
      ),
    );
    render(
      <ClubCommunicationComposer
        targetGroups={[{ id: "tg-1", name: "Aktive Mitglieder", status: "ACTIVE" }]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Gespeicherte Zielgruppen"));
    fireEvent.click(screen.getByRole("button", { name: "Aktive Mitglieder" }));
    fireEvent.click(screen.getByRole("button", { name: "Empfängervorschau" }));
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/communication/club/preview",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("requires review confirmation before send", async () => {
    render(
      <ClubCommunicationComposer
        targetGroups={[{ id: "tg-1", name: "Aktive Mitglieder", status: "ACTIVE" }]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nachricht"), { target: { value: "Hallo Verein" } });
    fireEvent.click(screen.getByRole("button", { name: "Mitteilung senden" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Zusammenfassung/);
  });

  it("detail page shows overview, content, and analytics without email-open fiction", async () => {
    render(await MitteilungDetailPage({ params: Promise.resolve({ id: "comm-1" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Training Dienstag" })).toBeInTheDocument();
    expect(screen.getByText("Anna Admin")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Zustellung & Reaktionen" })).toBeInTheDocument();
    expect(screen.queryByText(/E-Mail.*Gelesen/i)).not.toBeInTheDocument();
    expect(screen.getByText(/keine Öffnungs- oder Lese-Analytics/i)).toBeInTheDocument();
  });

  it("gates recipient detail table on engagement permission", async () => {
    mocks.resolveClubCommunicationAuthorization.mockResolvedValue({
      canSend: true,
      canViewEngagementDetail: false,
    });
    render(await MitteilungDetailPage({ params: Promise.resolve({ id: "comm-1" }) }));
    expect(mocks.listCommunicationDeliveryDetail).not.toHaveBeenCalled();
  });

  it("uses bounded list retrieval in service call", async () => {
    await ClubMitteilungenPage({ searchParams: Promise.resolve({ q: "Training", status: "PUBLISHED" }) });
    expect(mocks.listClubCommunications).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "Training",
        status: "PUBLISHED",
      }),
    );
  });

  it("retains COMM-UX-01 shell on list route", () => {
    const source = readRelative("app/(admin)/dashboard/communication/mitteilungen/page.tsx");
    expect(source).toContain("CommunicationWorkspaceHeader");
    expect(source).toContain("CommunicationContentSurface");
  });

  it("does not alter communication hub surface", () => {
    const hub = readRelative("app/(admin)/dashboard/communication/page.tsx");
    expect(hub).toContain("CommunicationHubView");
    const inbox = readRelative("app/(admin)/dashboard/communication/inbox/page.tsx");
    expect(inbox).toContain("CommunicationInboxWorkspace");
  });

  it("documents UX-04 boundaries", () => {
    const doc = readRelative("docs/communication/SCE-COMM-UX-04-MITTEILUNGEN.md");
    expect(doc).toContain("Product purpose");
    expect(doc).toContain("COMM-19");
  });

  it("analytics panel maps skip reasons constructively", () => {
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
    expect(screen.getByText(/Jugendschutz/)).toBeInTheDocument();
  });

  it("mobile list avoids table dependency", () => {
    const source = readRelative("app/(admin)/dashboard/communication/mitteilungen/page.tsx");
    expect(source).toContain("md:hidden");
    expect(source).toContain("hidden overflow-x-auto md:block");
  });

  it("send route permissions align with canonical club send keys", () => {
    expect(CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS).toContain(PERMISSIONS.COMMUNICATION_CLUB_SEND);
  });
});
