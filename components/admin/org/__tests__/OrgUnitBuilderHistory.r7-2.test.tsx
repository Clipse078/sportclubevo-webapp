/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import OrgUnitBuilderWorkspace from "@/components/admin/org/OrgUnitBuilderWorkspace";
import type { OrgUnitBuilderEnrichmentMap } from "@/lib/org/org-unit-builder-enrichment";
import type { OrgUnitCanvasItem } from "@/components/admin/org/OrgUnitCanvasView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const unitA: OrgUnitCanvasItem = {
  id: "unit-a",
  parentId: null,
  sortOrder: 0,
  key: "unit-a",
  name: "Vereinsleitung",
  type: "DIVISION",
  status: "ACTIVE",
  level: 0,
  description: null,
  archivedAt: null,
  _count: { memberships: 0, children: 0 },
};

const emptyEnrichment: OrgUnitBuilderEnrichmentMap = {
  "unit-a": {
    primaryMemberships: [],
    teamCount: 0,
    staffCount: 0,
    membershipCount: 0,
    staffAssignments: [],
  },
};

describe("OrgUnitBuilder R7.2 undo/redo", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/org-units/unit-a") && init?.method === "PUT") {
          return new Response(JSON.stringify({ orgUnit: { id: "unit-a" } }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes undo/redo toolbar controls with keyboard shortcuts", async () => {
    render(
      <OrgUnitBuilderWorkspace
        tenantId="tenant-1"
        orgUnits={[unitA]}
        builderEnrichment={emptyEnrichment}
        archivedOrgUnits={[]}
        showArchived={false}
        canManage={true}
        parentOptions={[]}
      />,
    );

    const undo = screen.getByTestId("org-canvas-undo");
    const redo = screen.getByTestId("org-canvas-redo");
    expect(undo).toBeDisabled();
    expect(redo).toBeDisabled();

    const search = screen.getByTestId("org-canvas-search");
    fireEvent.change(search, { target: { value: "test" } });
    fireEvent.keyDown(search, { key: "z", ctrlKey: true });
    expect(undo).toBeDisabled();

    const viewport = screen.getByTestId("org-unit-canvas-viewport");
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    const node = screen.getByTestId("org-unit-node-unit-a");
    const dragWrapper = node.parentElement!;
    dragWrapper.setPointerCapture = vi.fn();
    dragWrapper.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(node, { pointerId: 1, clientX: 10, clientY: 10, pointerType: "mouse" });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 40, clientY: 40, pointerType: "mouse" });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 40, clientY: 40, pointerType: "mouse" });

    await act(async () => {});
    expect(screen.getByTestId("org-canvas-undo")).not.toBeDisabled();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await act(async () => {});
    expect(screen.getByTestId("org-canvas-redo")).not.toBeDisabled();
  });
});
