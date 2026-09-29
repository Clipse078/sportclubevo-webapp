// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
  listZielgruppenForManagement: vi.fn(),
  getZielgruppeForManagement: vi.fn(),
  loadZielgruppeDefinitionLabels: vi.fn(),
  getZielgruppeUsageSummary: vi.fn(),
  createEffectivePermissionResolver: vi.fn(),
  previewZielgruppeRecipientsAction: vi.fn(),
  searchZielgruppeOrgUnitsAction: vi.fn(),
  searchZielgruppeTeamsAction: vi.fn(),
  searchZielgruppeRolesAction: vi.fn(),
  searchZielgruppePersonsAction: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));
vi.mock("@/lib/communication/zielgruppen/management-service", () => ({
  listZielgruppenForManagement: mocks.listZielgruppenForManagement,
  getZielgruppeForManagement: mocks.getZielgruppeForManagement,
}));
vi.mock("@/lib/communication/zielgruppen/load-definition-labels", () => ({
  loadZielgruppeDefinitionLabels: mocks.loadZielgruppeDefinitionLabels,
}));
vi.mock("@/lib/communication/zielgruppen/usage-references", () => ({
  getZielgruppeUsageSummary: mocks.getZielgruppeUsageSummary,
}));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: mocks.createEffectivePermissionResolver,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/app/(admin)/dashboard/communication/zielgruppen/actions", () => ({
  previewZielgruppeRecipientsAction: mocks.previewZielgruppeRecipientsAction,
  searchZielgruppeOrgUnitsAction: mocks.searchZielgruppeOrgUnitsAction,
  searchZielgruppeTeamsAction: mocks.searchZielgruppeTeamsAction,
  searchZielgruppeRolesAction: mocks.searchZielgruppeRolesAction,
  searchZielgruppePersonsAction: mocks.searchZielgruppePersonsAction,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import CommunicationZielgruppenPage from "../zielgruppen/page";
import NewZielgruppePage from "../zielgruppen/new/page";
import ZielgruppeDetailPage from "../zielgruppen/[id]/page";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";
import ZielgruppePreviewPanel from "@/components/admin/communication/zielgruppen/ZielgruppePreviewPanel";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE,
  ZIELGRUPPEN_OVERVIEW_DESCRIPTION,
} from "@/lib/communication/zielgruppen/zielgruppen-display";

const TENANT_ID = "tenant-zg-ux";

const sampleRow = {
  id: "tg-1",
  key: "trainer-junioren",
  name: "Trainer Junioren",
  description: "Alle Trainer in Junioren",
  status: "ACTIVE",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-06-01"),
  summaryHeadline: "Junioren",
  summaryParts: ["2 Rollen"],
  ruleCharacterLabel: "ODER-Regeln",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAnyPermission.mockResolvedValue({ user: { id: "user-1" } });
  mocks.getActiveTenant.mockResolvedValue({ id: TENANT_ID, key: "fc-test" });
  mocks.getRequestEffectivePermissions.mockResolvedValue({
    tenant: [PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE],
  });
  mocks.createEffectivePermissionResolver.mockReturnValue({
    hasTenantDeletionAuthority: vi.fn().mockResolvedValue(false),
  });
  mocks.listZielgruppenForManagement.mockResolvedValue([]);
  mocks.loadZielgruppeDefinitionLabels.mockResolvedValue({
    orgUnits: {},
    teams: {},
    roles: { "role-1": "Trainer" },
    persons: {},
  });
  mocks.getZielgruppeUsageSummary.mockResolvedValue({ references: [], truncated: false });
  mocks.previewZielgruppeRecipientsAction.mockResolvedValue({
    ok: true,
    data: {
      candidates: 5,
      excluded: 0,
      effective: 5,
      externalCount: 0,
      scopeNotice: null,
      recipients: [
        {
          kind: "PERSON",
          personId: "p-1",
          displayName: "Max Muster",
          includedPaths: [{ code: "DIRECT_PERSON", label: "Direkt hinzugefügt" }],
        },
      ],
      hasMore: false,
    },
  });
  global.fetch = mocks.fetch as unknown as typeof fetch;
});

describe("SCE-COMM-UX-06 Zielgruppen", () => {
  it("overview renders header description and empty state CTA", async () => {
    const page = await CommunicationZielgruppenPage({ searchParams: Promise.resolve({}) });
    render(page);
    expect(screen.getByRole("heading", { level: 1, name: "Zielgruppen" })).toBeInTheDocument();
    expect(screen.getByText(ZIELGRUPPEN_OVERVIEW_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Neue Zielgruppe/i }).length).toBeGreaterThan(0);
  });

  it("overview lists rows with rule character", async () => {
    mocks.listZielgruppenForManagement.mockResolvedValue([sampleRow]);
    const page = await CommunicationZielgruppenPage({ searchParams: Promise.resolve({}) });
    render(page);
    expect(screen.getAllByText("Trainer Junioren").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ODER-Regeln").length).toBeGreaterThan(0);
  });

  it("overview filtered empty state", async () => {
    mocks.listZielgruppenForManagement.mockResolvedValue([]);
    const page = await CommunicationZielgruppenPage({
      searchParams: Promise.resolve({ q: "xyz" }),
    });
    render(page);
    expect(screen.getByText(/Keine Zielgruppen gefunden/i)).toBeInTheDocument();
  });

  it("hides Neue Zielgruppe when user cannot manage", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      tenant: [PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW],
    });
    const page = await CommunicationZielgruppenPage({ searchParams: Promise.resolve({}) });
    render(page);
    expect(screen.queryByRole("link", { name: /Neue Zielgruppe/i })).not.toBeInTheDocument();
  });

  it("create page opens compact editor (UXR1 single-page builder)", async () => {
    const page = await NewZielgruppePage();
    render(page);
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByTestId("zielgruppe-save")).toBeInTheDocument();
    expect(screen.getByText(/^Einschliessen$/i)).toBeInTheDocument();
  });

  it("validates name before save", async () => {
    render(<ZielgruppeManagementForm mode="create" />);
    const form = screen.getAllByRole("button", { name: /Zielgruppe speichern/i })[0]!.closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Name ist erforderlich/i);
  });

  it("definition editor shows human-readable rules not json", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={{
          ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
          roleIds: ["role-1"],
        }}
        onChange={() => {}}
        knownLabels={{ orgUnits: {}, teams: {}, roles: { "role-1": "Trainer" }, persons: {} }}
      />,
    );
    expect(screen.getAllByText("Trainer").length).toBeGreaterThan(0);
    expect(screen.getByText("Rolle")).toBeInTheDocument();
    expect(screen.queryByText(/ruleJson/i)).not.toBeInTheDocument();
  });

  it("preview is explicit and explains delivery boundary", async () => {
    const user = userEvent.setup();
    render(
      <ZielgruppePreviewPanel
        definition={{
          ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
          wholeOrganisation: true,
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Hinweise zur Vorschau/i }));
    expect(screen.getByText(ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Vorschau aktualisieren/i }));
    expect(mocks.previewZielgruppeRecipientsAction).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Max Muster/)).toBeInTheDocument();
  });

  it("detail page shows usage and readable definition", async () => {
    mocks.getZielgruppeForManagement.mockResolvedValue({
      ...sampleRow,
      definition: {
        ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
        roleIds: ["role-1"],
      },
      summary: { headline: "Trainer", parts: [] },
    });
    mocks.getZielgruppeUsageSummary.mockResolvedValue({
      references: [
        {
          kind: "CAMPAIGN",
          id: "c-1",
          label: "Frühjahr",
          href: "/dashboard/communication/kampagnen/c-1",
          statusHint: "DRAFT",
        },
      ],
      truncated: false,
    });
    const page = await ZielgruppeDetailPage({
      params: Promise.resolve({ id: "tg-1" }),
      searchParams: Promise.resolve({}),
    });
    render(page);
    expect(screen.getByText(/Verwendet in/i)).toBeInTheDocument();
    expect(screen.getByText("Frühjahr")).toBeInTheDocument();
    expect(screen.getAllByText(/Rolle ist „Trainer"/).length).toBeGreaterThan(0);
  });

  it("chip remove control has accessible name", () => {
    render(
      <ZielgruppeDefinitionEditor
        value={{
          ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION,
          teamIds: ["t-1"],
        }}
        onChange={() => {}}
        knownLabels={{ orgUnits: {}, teams: { "t-1": "F2" }, roles: {}, persons: {} }}
      />,
    );
    expect(screen.getByRole("button", { name: /F2 entfernen/i })).toBeInTheDocument();
  });

  it("background asset unchanged", () => {
    const buf = readFileSync(join(process.cwd(), "public/images/background/SCE_background.png"));
    const hash = createHash("sha256").update(buf).digest("hex");
    expect(hash).toBe("583698dfdf8562c192ef1f1b8319c3681e888d13d049ee2ac6c96d7cbf76eb09");
  });
});
