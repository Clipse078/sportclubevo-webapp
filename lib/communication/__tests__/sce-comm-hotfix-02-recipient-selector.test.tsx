/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DirectMessageComposer from "@/components/admin/communication/direct/DirectMessageComposer";
import CommunicationAudienceSelector from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import { emptyCommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";
import { resolveCommunicationAudienceCapabilities } from "@/lib/communication/audience/communication-audience-capabilities";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/admin/communication/attachments/use-communication-attachment-upload", () => ({
  useCommunicationAttachmentUpload: () => ({
    attachments: [],
    error: null,
    addFiles: vi.fn(),
    removeAttachment: vi.fn(),
    readyAttachmentIds: [],
    hasUnreadyAttachments: false,
  }),
}));

function mockFetch(input: {
  capabilities?: Record<string, boolean>;
  discoverGroups?: Array<{
    kind: string;
    heading: string;
    options: Array<{ id: string; label: string; description?: string | null }>;
  }>;
  discoverNoAccess?: boolean;
  discoverError?: boolean;
  preview?: Record<string, unknown>;
}) {
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    const href = String(url);
    if (href.includes("/api/communication/personal-signature")) {
      return new Response(JSON.stringify({ preference: {} }), { status: 200 });
    }
    if (href.includes("/api/communication/audience/capabilities")) {
      return new Response(
        JSON.stringify({
          capabilities: input.capabilities ?? {
            wholeOrganisation: true,
            orgUnits: true,
            teams: true,
            targetGroups: true,
            roles: true,
            persons: true,
          },
        }),
        { status: 200 },
      );
    }
    if (href.includes("/api/communication/audience/discover")) {
      if (input.discoverError) {
        return new Response(JSON.stringify({ error: "fail" }), { status: 500 });
      }
      if (input.discoverNoAccess) {
        return new Response(JSON.stringify({ groups: [], noAccess: true }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          groups: input.discoverGroups ?? [
            {
              kind: "person",
              heading: "Personen",
              options: [{ id: "p1", label: "Anna Müller", description: "anna@test.ch" }],
            },
            {
              kind: "team",
              heading: "Teams",
              options: [{ id: "t1", label: "F2", description: null }],
            },
          ],
          noAccess: false,
        }),
        { status: 200 },
      );
    }
    if (href.includes("/api/communication/audience/preview")) {
      return new Response(
        JSON.stringify(
          input.preview ?? {
            candidates: 1,
            effective: 1,
            excluded: 0,
            scopeNotice: null,
            audienceSummary: "Person Anna Müller",
            dynamicAudienceNotice: null,
            guardianDeliveryCount: null,
            recipients: [{ personId: "p1", displayName: "Anna Müller" }],
          },
        ),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
}

describe("SCE-COMM-HOTFIX-02 recipient selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("STAGE regression: tenant admin capabilities enable selector controls (not empty ORGANISATION shell)", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      tenant: [PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
      platform: [],
    });
    const caps = await resolveCommunicationAudienceCapabilities({
      tenantId: "tenant-1",
      userId: "user-1",
      context: { kind: "DIRECT", tenantId: "tenant-1" },
    });
    expect(caps.persons).toBe(true);
    expect(caps.teams).toBe(true);
    expect(caps.orgUnits).toBe(true);
  });

  it("STAGE failure repro: all capabilities false hides usable recipient triggers", async () => {
    mockFetch({
      capabilities: {
        wholeOrganisation: false,
        orgUnits: false,
        teams: false,
        targetGroups: false,
        roles: false,
        persons: false,
        externalContacts: false,
      },
    });

    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: false,
          teams: false,
          targetGroups: false,
          roles: false,
          persons: false,
          externalContacts: false,
        }}
      />,
    );

    expect(screen.queryByTestId("communication-audience-open-trigger")).not.toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-no-access")).toBeInTheDocument();
  });

  it("Neue Nachricht renders recipient open trigger", async () => {
    mockFetch({});
    render(<DirectMessageComposer tenantId="tenant-1" />);
    expect(await screen.findByTestId("communication-audience-open-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-add-trigger")).toBeInTheDocument();
  });

  it("selector opens and exposes unified search input", async () => {
    mockFetch({});
    const user = userEvent.setup();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );

    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    expect(await screen.findByTestId("communication-audience-unified-search")).toBeInTheDocument();
  });

  it("Person results render and Person can be selected", async () => {
    mockFetch({});
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={onChange}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );

    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-option-person-p1")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("communication-audience-option-person-p1"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ personIds: ["p1"] }),
    );
  });

  it("Team can be selected and duplicate Person selection is ignored", async () => {
    mockFetch({});
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={{ ...emptyCommunicationAudienceSelection(), personIds: ["p1"] }}
        onChange={onChange}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );

    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-option-team-t1")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("communication-audience-option-team-t1"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: ["t1"], personIds: ["p1"] }),
    );

    const personButton = screen.getByTestId("communication-audience-option-person-p1");
    expect(personButton).toBeDisabled();
  });

  it("OrgUnit, Role, and Zielgruppe options can be selected", async () => {
    mockFetch({
      discoverGroups: [
        { kind: "orgUnit", heading: "Organisation", options: [{ id: "ou1", label: "Kinderfussball" }] },
        { kind: "role", heading: "Rollen", options: [{ id: "r1", label: "Trainer" }] },
        {
          kind: "targetGroup",
          heading: "Zielgruppen",
          options: [{ id: "tg1", label: "Alle Trainer" }],
        },
      ],
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={onChange}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );

    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    await user.click(await screen.findByTestId("communication-audience-option-orgUnit-ou1"));
    await user.click(screen.getByTestId("communication-audience-option-role-r1"));
    await user.click(screen.getByTestId("communication-audience-option-targetGroup-tg1"));
    expect(onChange).toHaveBeenCalled();
  });

  it("selected token can be removed", async () => {
    mockFetch({});
    const onChange = vi.fn();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={{ ...emptyCommunicationAudienceSelection(), personIds: ["p1"] }}
        onChange={onChange}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Person .* entfernen/));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ personIds: [] }),
    );
  });

  it("empty search state renders when discover returns no groups", async () => {
    mockFetch({ discoverGroups: [] });
    const user = userEvent.setup();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );
    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    expect(await screen.findByTestId("communication-audience-empty-search")).toBeInTheDocument();
  });

  it("API error state renders with retry", async () => {
    mockFetch({ discoverError: true });
    const user = userEvent.setup();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );
    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    expect(await screen.findByTestId("communication-audience-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Erneut versuchen" })).toBeInTheDocument();
  });

  it("loading state renders while discover loads", async () => {
    let resolveDiscover: (value: Response) => void = () => {};
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.includes("/api/communication/audience/discover")) {
        return new Promise<Response>((resolve) => {
          resolveDiscover = resolve;
        });
      }
      if (href.includes("/api/communication/audience/capabilities")) {
        return new Response(JSON.stringify({ capabilities: { persons: true, teams: true, orgUnits: true, roles: true, targetGroups: true, wholeOrganisation: false } }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const user = userEvent.setup();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );
    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    expect(screen.getByTestId("communication-audience-loading")).toBeInTheDocument();
    resolveDiscover(
      new Response(JSON.stringify({ groups: [], noAccess: false }), { status: 200 }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("communication-audience-loading")).not.toBeInTheDocument(),
    );
  });

  it("resolved recipient preview can be expanded", async () => {
    mockFetch({});
    const user = userEvent.setup();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={{ ...emptyCommunicationAudienceSelection(), personIds: ["p1"] }}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-show-recipients")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("communication-audience-show-recipients"));
    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-recipient-detail")).toBeInTheDocument(),
    );
  });

  it("unauthorized sender capabilities remain disabled without direct send permission", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      tenant: [PERMISSIONS.COMMUNICATION_INBOX_VIEW],
      platform: [],
    });
    const caps = await resolveCommunicationAudienceCapabilities({
      tenantId: "tenant-1",
      userId: "user-1",
      context: { kind: "DIRECT", tenantId: "tenant-1" },
    });
    expect(caps.persons).toBe(false);
    expect(caps.teams).toBe(false);
  });

  it("scope-limited team sender retains structural selector capability", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      tenant: [PERMISSIONS.COMMUNICATION_TEAM_SEND],
      platform: [],
    });
    const caps = await resolveCommunicationAudienceCapabilities({
      tenantId: "tenant-1",
      userId: "user-1",
      context: { kind: "DIRECT", tenantId: "tenant-1" },
    });
    expect(caps.persons).toBe(true);
    expect(caps.wholeOrganisation).toBe(false);
  });

  it("selector uses sheet dialog on all viewports (no compact popover)", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    mockFetch({});
    const user = userEvent.setup();
    render(
      <CommunicationAudienceSelector
        context="DIRECT"
        value={emptyCommunicationAudienceSelection()}
        onChange={vi.fn()}
        features={{
          wholeOrganisation: false,
          orgUnits: true,
          teams: true,
          targetGroups: true,
          roles: true,
          persons: true,
        }}
      />,
    );
    await user.click(screen.getByTestId("communication-audience-add-trigger"));
    expect(await screen.findByRole("dialog", { name: "Empfänger hinzufügen" })).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-picker-panel")).toBeInTheDocument();
    expect(screen.getByTestId("sce-sheet-overlay")).toBeInTheDocument();
  });
});
