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
