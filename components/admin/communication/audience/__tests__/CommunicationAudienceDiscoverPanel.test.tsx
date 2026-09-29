/**
 * @vitest-environment jsdom
 * SCE-ZIELGRUPPEN-02-UXR2 — audience picker presentation & behavior
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CommunicationAudienceDiscoverPanel,
  type CommunicationAudienceDiscoverPick,
} from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import { emptyCommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";

function mockDiscover(
  groups: Array<{
    kind: string;
    heading: string;
    options: Array<{ id: string; label: string; description?: string | null }>;
  }> = [
    {
      kind: "orgUnit",
      heading: "Organisationseinheiten",
      options: [{ id: "ou1", label: "Vereinsleitung", description: null }],
    },
    {
      kind: "team",
      heading: "Teams",
      options: [{ id: "t1", label: "F2 Junioren", description: "Junioren F" }],
    },
  ],
) {
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    const href = String(url);
    if (href.includes("/api/communication/audience/discover")) {
      return new Response(JSON.stringify({ groups, noAccess: false }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
}

const enabledAll = {
  wholeOrganisation: false,
  orgUnits: true,
  teams: true,
  roles: true,
  targetGroups: false,
  persons: true,
  externalContacts: true,
};

const enabledAutomatic = {
  wholeOrganisation: false,
  orgUnits: true,
  teams: true,
  roles: true,
  targetGroups: false,
  persons: false,
  externalContacts: false,
};

const enabledDirect = {
  wholeOrganisation: false,
  orgUnits: false,
  teams: false,
  roles: false,
  targetGroups: false,
  persons: true,
  externalContacts: true,
};

describe("CommunicationAudienceDiscoverPanel (UXR2)", () => {
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

  it("opens as substantial sheet with browseable results without search", async () => {
    mockDiscover();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
        dialogTitle="Auswahl hinzufügen"
      />,
    );

    expect(screen.getByTestId("communication-audience-picker-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("communication-audience-option-orgUnit-ou1")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-option-team-t1")).toBeInTheDocument();
    expect(screen.queryByText(/Empfänger werden geladen/i)).not.toBeInTheDocument();
  });

  it("shows automatic categories only (Alle, Organisation, Teams, Rollen)", async () => {
    mockDiscover();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("communication-audience-category-all")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-category-orgUnit")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-category-team")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-category-role")).toBeInTheDocument();
    expect(screen.queryByTestId("communication-audience-category-person")).not.toBeInTheDocument();
    expect(screen.queryByTestId("communication-audience-category-external")).not.toBeInTheDocument();
  });

  it("shows direct categories (Alle, Personen, Externe)", async () => {
    mockDiscover([
      {
        kind: "person",
        heading: "Personen",
        options: [{ id: "p1", label: "Anna", description: "anna@test.ch" }],
      },
    ]);
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledDirect}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("communication-audience-category-person")).toBeInTheDocument();
    expect(screen.getByTestId("communication-audience-category-external")).toBeInTheDocument();
    expect(screen.queryByTestId("communication-audience-category-team")).not.toBeInTheDocument();
  });

  it("shows exclusion categories including Personen and Externe", async () => {
    mockDiscover();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAll}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    for (const id of ["all", "orgUnit", "team", "role", "person", "external"] as const) {
      expect(screen.getByTestId(`communication-audience-category-${id}`)).toBeInTheDocument();
    }
  });

  it("batch confirm applies multiple picks and persists pending across category switch", async () => {
    mockDiscover();
    const user = userEvent.setup();
    const onConfirmBatch = vi.fn<(picks: CommunicationAudienceDiscoverPick[]) => void>();

    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
        batchConfirm
        onConfirmBatch={onConfirmBatch}
      />,
    );

    await user.click(await screen.findByTestId("communication-audience-option-orgUnit-ou1"));
    await user.click(screen.getByTestId("communication-audience-category-team"));
    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-option-team-t1")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("communication-audience-option-team-t1"));
    expect(screen.getByTestId("communication-audience-pending-count")).toHaveTextContent("2 ausgewählt");

    await user.click(screen.getByTestId("communication-audience-confirm-picks"));
    expect(onConfirmBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ kind: "orgUnit", id: "ou1" }),
        expect.objectContaining({ kind: "team", id: "t1" }),
      ]),
    );
  });

  it("disables confirm when nothing pending", async () => {
    mockDiscover();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
        batchConfirm
      />,
    );

    expect(screen.getByTestId("communication-audience-confirm-picks")).toBeDisabled();
  });

  it("filters via debounced search", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const href = String(url);
      if (href.includes("/api/communication/audience/discover")) {
        const q = new URL(href, "http://local").searchParams.get("q") ?? "";
        const groups =
          q === "trainer"
            ? [
                {
                  kind: "role",
                  heading: "Rollen",
                  options: [{ id: "r1", label: "Trainer", description: null }],
                },
              ]
            : [];
        return new Response(JSON.stringify({ groups, noAccess: false }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });
    global.fetch = fetchMock as typeof fetch;

    const user = userEvent.setup();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    await user.type(screen.getByTestId("communication-audience-unified-search"), "trainer");
    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-option-role-r1")).toBeInTheDocument(),
    );
  });

  it("renders skeleton loading state", async () => {
    const resolvers: Array<(value: Response) => void> = [];
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/api/communication/audience/discover")) {
        return new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        });
      }
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("communication-audience-loading")).toBeInTheDocument(),
    );
    for (const resolveDiscover of resolvers) {
      resolveDiscover(new Response(JSON.stringify({ groups: [], noAccess: false }), { status: 200 }));
    }
    await waitFor(() =>
      expect(screen.queryByTestId("communication-audience-loading")).not.toBeInTheDocument(),
    );
  });

  it("passes enabled sources to discover API (feature adapter contract)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ groups: [], noAccess: false }), { status: 200 }),
    );
    global.fetch = fetchMock as typeof fetch;

    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("sources=orgUnit%2Cteam%2Crole");
    expect(url).toContain("q=");
  });

  it("uses canonical search input padding (fca-search-input)", async () => {
    mockDiscover();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
      />,
    );

    const input = screen.getByTestId("communication-audience-unified-search");
    expect(input.className).toContain("fca-search-input");
  });

  it("desktop uses sheet dialog semantics (not compact popover)", async () => {
    mockDiscover();
    render(
      <CommunicationAudienceDiscoverPanel
        open
        onOpenChange={() => {}}
        context="ORGANISATION"
        enabledFeatures={enabledAutomatic}
        selection={emptyCommunicationAudienceSelection()}
        onPick={vi.fn()}
        dialogTitle="Auswahl hinzufügen"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Auswahl hinzufügen" })).toBeInTheDocument();
    expect(screen.getByTestId("sce-sheet-overlay")).toBeInTheDocument();
  });
});
