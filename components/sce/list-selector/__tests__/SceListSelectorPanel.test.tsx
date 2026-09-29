/**
 * @vitest-environment jsdom
 * SCE-SELECTOR-01 — generic list selector engine
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceListSelectorPanel } from "@/components/sce/list-selector/SceListSelectorPanel";
import type { SceListSelectorFetchParams } from "@/lib/sce/list-selector/use-sce-list-selector-query";

const browseGroups = [
  {
    type: "ORG_UNIT" as const,
    heading: "Organisation",
    items: [{ id: "ou1", type: "ORG_UNIT" as const, label: "Vereinsleitung" }],
  },
  {
    type: "TEAM" as const,
    heading: "Teams",
    items: [{ id: "t1", type: "TEAM" as const, label: "F2 Junioren", description: "Junioren F" }],
  },
];

function mockFetch(
  impl?: (params: SceListSelectorFetchParams) => Promise<{
    groups: typeof browseGroups;
    noAccess?: boolean;
    error?: string;
  }>,
) {
  return vi.fn(
    impl ??
      (async () => ({
        groups: browseGroups,
        noAccess: false,
      })),
  );
}

describe("SceListSelectorPanel", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
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

  it("OPEN + empty query renders browse results (release-blocking contract)", async () => {
    const fetchResults = mockFetch();
    render(
      <SceListSelectorPanel
        open
        onOpenChange={() => {}}
        title="Auswahl"
        enabledTypes={["ORG_UNIT", "TEAM", "ROLE"]}
        fetchResults={fetchResults}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("sce-list-selector-option-ORG_UNIT-ou1")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("sce-list-selector-option-TEAM-t1")).toBeInTheDocument();
    expect(screen.queryByTestId("sce-list-selector-loading")).not.toBeInTheDocument();
    expect(fetchResults).toHaveBeenCalledWith(
      expect.objectContaining({ query: "", category: "all" }),
    );
  });

  it("clears skeleton after success", async () => {
    const resolvers: Array<
      (value: { groups: typeof browseGroups; noAccess: boolean }) => void
    > = [];
    const fetchResults = vi.fn(
      () =>
        new Promise<{ groups: typeof browseGroups; noAccess: boolean }>((res) => {
          resolvers.push(res);
        }),
    );

    render(
      <SceListSelectorPanel
        open
        onOpenChange={() => {}}
        title="Auswahl"
        enabledTypes={["TEAM"]}
        fetchResults={fetchResults}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("sce-list-selector-loading")).toBeInTheDocument());
    for (const resolve of resolvers) {
      resolve({ groups: browseGroups, noAccess: false });
    }
    await waitFor(() =>
      expect(screen.queryByTestId("sce-list-selector-loading")).not.toBeInTheDocument(),
    );
  });

  it("uses fca-search-input padding for leading search icon", async () => {
    render(
      <SceListSelectorPanel
        open
        onOpenChange={() => {}}
        title="Auswahl"
        enabledTypes={["TEAM"]}
        fetchResults={mockFetch(async () => ({ groups: [], noAccess: false }))}
        searchPlaceholder="Personen, Teams, Organisation oder Rollen suchen …"
      />,
    );

    const input = screen.getByTestId("sce-list-selector-search");
    expect(input.className).toContain("fca-input");
    expect(input.className).toContain("fca-search-input");
    expect(input.className).not.toMatch(/\bpl-10\b/);
  });

  it("shows Mehr anzeigen and loads additional rows", async () => {
    const user = userEvent.setup();
    const fetchResults = vi.fn(async (params: SceListSelectorFetchParams) => {
      if (params.cursors?.TEAM) {
        return {
          groups: [
            {
              type: "TEAM" as const,
              heading: "Teams",
              items: [{ id: "t2", type: "TEAM" as const, label: "F3 Junioren" }],
              hasMore: false,
              nextCursor: null,
            },
          ],
        };
      }
      return {
        groups: [
          {
            type: "TEAM" as const,
            heading: "Teams",
            items: [{ id: "t1", type: "TEAM" as const, label: "F2 Junioren" }],
            hasMore: true,
            nextCursor: "1",
          },
        ],
      };
    });

    render(
      <SceListSelectorPanel
        open
        onOpenChange={() => {}}
        title="Auswahl"
        enabledTypes={["TEAM"]}
        fetchResults={fetchResults}
      />,
    );

    await screen.findByTestId("sce-list-selector-option-TEAM-t1");
    await user.click(screen.getByTestId("sce-list-selector-load-more-TEAM"));
    await screen.findByTestId("sce-list-selector-option-TEAM-t2");
    expect(fetchResults).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursors: { TEAM: "1" } }),
    );
  });

  it("supports keyboard navigation and multi-select without closing", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SceListSelectorPanel
        open
        onOpenChange={onOpenChange}
        title="Auswahl"
        enabledTypes={["ORG_UNIT", "TEAM"]}
        mode="multiple"
        fetchResults={mockFetch()}
      />,
    );

    await screen.findByTestId("sce-list-selector-option-ORG_UNIT-ou1");
    const listArea = document.querySelector('[data-testid="sce-list-selector-panel"] [tabindex="0"]');
    expect(listArea).toBeTruthy();
    await user.click(listArea as Element);
    await user.keyboard("{End}");
    await waitFor(() => {
      const lastOption = document.querySelector('[data-sce-selector-option-index="1"]');
      expect(lastOption?.className).toMatch(/surface-2/);
    });
    await user.keyboard(" ");
    await waitFor(() =>
      expect(screen.getByTestId("sce-list-selector-pending-count")).toHaveTextContent(
        "1 ausgewählt",
      ),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("multi-select confirm emits picks", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <SceListSelectorPanel
        open
        onOpenChange={() => {}}
        title="Auswahl"
        enabledTypes={["ORG_UNIT", "TEAM"]}
        mode="multiple"
        fetchResults={mockFetch()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(await screen.findByTestId("sce-list-selector-option-ORG_UNIT-ou1"));
    await user.click(screen.getByTestId("sce-list-selector-option-TEAM-t1"));
    await user.click(screen.getByTestId("sce-list-selector-confirm"));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: "ORG_UNIT", id: "ou1" }),
        expect.objectContaining({ type: "TEAM", id: "t1" }),
      ]),
    );
  });
});
