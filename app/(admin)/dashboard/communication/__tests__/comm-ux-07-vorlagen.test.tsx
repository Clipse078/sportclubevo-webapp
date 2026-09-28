// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
  listVorlagenForManagement: vi.fn(),
  getVorlageForManagement: vi.fn(),
  getTemplateUsageSummary: vi.fn(),
  resolvePlatformTemplateAuthorization: vi.fn(),
  requirePlatformTemplateManage: vi.fn(),
  listZielgruppenForManagement: vi.fn(),
  resolveSponsorAudienceAuthorization: vi.fn(),
  listPlatformCommunicationTemplates: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({ getActiveTenant: mocks.getActiveTenant }));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));
vi.mock("@/lib/communication/templates/template-management-service", () => ({
  listVorlagenForManagement: mocks.listVorlagenForManagement,
  getVorlageForManagement: mocks.getVorlageForManagement,
  templateKindAllowedForMitteilungComposer: (kind: string) =>
    kind === "ANNOUNCEMENT" || kind === "ALERT",
  DIRECT_MESSAGE_TEMPLATE_BOUNDARY: "boundary",
}));
vi.mock("@/lib/communication/templates/template-usage-references", () => ({
  getTemplateUsageSummary: mocks.getTemplateUsageSummary,
}));
vi.mock("@/lib/communication/templates/platform-template-authorization", () => ({
  resolvePlatformTemplateAuthorization: mocks.resolvePlatformTemplateAuthorization,
  requirePlatformTemplateManage: mocks.requirePlatformTemplateManage,
}));
vi.mock("@/lib/communication/templates/platform-template-service", () => ({
  listPlatformCommunicationTemplates: mocks.listPlatformCommunicationTemplates,
}));
vi.mock("@/lib/communication/zielgruppen/management-service", () => ({
  listZielgruppenForManagement: mocks.listZielgruppenForManagement,
}));
vi.mock("@/lib/sponsoring/sponsor-authorization", () => ({
  resolveSponsorAudienceAuthorization: mocks.resolveSponsorAudienceAuthorization,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { sponsorOrganisation: { findMany: vi.fn().mockResolvedValue([]) } } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import CommunicationTemplatesPage from "../vorlagen/page";
import NewVorlagePage from "../vorlagen/new/page";
import VorlageDetailPage from "../vorlagen/[id]/page";
import VorlageManagementForm from "@/components/admin/communication/vorlagen/VorlageManagementForm";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { VORLAGEN_OVERVIEW_DESCRIPTION } from "@/lib/communication/templates/vorlagen-display";
import { PLATFORM_COMMUNICATION_TEMPLATE_KINDS } from "@/lib/communication/templates/platform-template-constants";

const TENANT_ID = "tenant-vl-ux";

const sampleRow = {
  id: "tpl-1",
  name: "Saisonstart",
  description: "Willkommen",
  kind: "ANNOUNCEMENT" as const,
  status: "ACTIVE",
  subject: "Saison 26/27",
  updatedAt: "2026-06-01T10:00:00.000Z",
  applicabilityLabel: "Mitteilungen",
  contentPreview: "Liebe Mitglieder…",
  usageCount: 2,
  creatorDisplayName: "Alex Admin",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({ user: { id: "user-1" } });
  mocks.getActiveTenant.mockResolvedValue({ id: TENANT_ID, key: "fc-test" });
  mocks.getRequestEffectivePermissions.mockResolvedValue({
    tenant: [PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE, PERMISSIONS.COMMUNICATION_CLUB_SEND],
  });
  mocks.resolvePlatformTemplateAuthorization.mockResolvedValue({ canManage: true, canView: true });
  mocks.requirePlatformTemplateManage.mockResolvedValue(undefined);
  mocks.listVorlagenForManagement.mockResolvedValue([]);
  mocks.listZielgruppenForManagement.mockResolvedValue([
    { id: "tg-1", name: "Alle Trainer", status: "ACTIVE" },
  ]);
  mocks.resolveSponsorAudienceAuthorization.mockResolvedValue({ canViewSponsorData: false });
  mocks.getTemplateUsageSummary.mockResolvedValue({ references: [], totalCount: 0, truncated: false });
  mocks.listPlatformCommunicationTemplates.mockResolvedValue([]);
  global.fetch = mocks.fetch as unknown as typeof fetch;
});

describe("SCE-COMM-UX-07 Vorlagen", () => {
  it("overview renders with description and Neue Vorlage when authorized", async () => {
    render(await CommunicationTemplatesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Vorlagen" })).toBeInTheDocument();
    expect(screen.getByText(VORLAGEN_OVERVIEW_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Neue Vorlage/i }).length).toBeGreaterThan(0);
  });

  it("shows empty state without templates", async () => {
    render(await CommunicationTemplatesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Noch keine Vorlagen")).toBeInTheDocument();
  });

  it("lists templates in table and mobile list", async () => {
    mocks.listVorlagenForManagement.mockResolvedValue([sampleRow]);
    render(await CommunicationTemplatesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByText("Saisonstart").length).toBeGreaterThan(0);
    expect(screen.getByText("2×")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorlagen")).toBeInTheDocument();
  });

  it("filtered empty state mentions reset", async () => {
    render(await CommunicationTemplatesPage({ searchParams: Promise.resolve({ q: "xyz" }) }));
    expect(screen.getByText(/Keine Vorlagen gefunden/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Filter zurücksetzen/i })).toBeInTheDocument();
  });

  it("create page opens wizard basics", async () => {
    render(await NewVorlagePage());
    expect(screen.getByRole("heading", { level: 1, name: "Neue Vorlage" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
  });

  it("editor validates name on step advance", async () => {
    const user = userEvent.setup();
    render(
      <VorlageManagementForm
        mode="create"
        canManage
        targetGroups={[{ id: "tg-1", name: "Trainer", status: "ACTIVE" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Name ist erforderlich/i);
  });

  it("supported kind options match COMM-16", () => {
    expect(PLATFORM_COMMUNICATION_TEMPLATE_KINDS).toEqual([
      "CAMPAIGN",
      "MESSAGE",
      "ANNOUNCEMENT",
      "ALERT",
    ]);
  });

  it("detail shows usage panel and metadata", async () => {
    mocks.getVorlageForManagement.mockResolvedValue({
      id: "tpl-1",
      name: "Saisonstart",
      description: null,
      kind: "CAMPAIGN",
      status: "ACTIVE",
      internalName: "intern",
      subject: "Hi",
      bodyText: "Text",
      audienceSpec: null,
      orchestration: {
        schemaVersion: 1,
        channels: { inApp: true, push: true, email: false },
        scheduling: { mode: "IMMEDIATE", scheduledAt: null, timezone: null },
      },
      updatedAt: "2026-06-01T10:00:00.000Z",
      createdAt: "2026-01-01T10:00:00.000Z",
      creatorDisplayName: "Alex Admin",
      audienceSummary: "Ganzer Verein",
    });
    render(
      await VorlageDetailPage({
        params: Promise.resolve({ id: "tpl-1" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("heading", { level: 1, name: "Saisonstart" })).toBeInTheDocument();
    expect(screen.getByText(/Verwendet in/i)).toBeInTheDocument();
    expect(screen.getByText("Alex Admin")).toBeInTheDocument();
  });

  it("background asset unchanged", () => {
    const buf = readFileSync(join(process.cwd(), "public/images/background/SCE_background.png"));
    const hash = createHash("sha256").update(buf).digest("hex");
    expect(hash).toBe("583698dfdf8562c192ef1f1b8319c3681e888d13d049ee2ac6c96d7cbf76eb09");
  });
});
