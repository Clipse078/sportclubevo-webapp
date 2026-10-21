/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import OrgUnitBuilderWorkspace from "@/components/admin/org/OrgUnitBuilderWorkspace";
import OrgUnitCanvasView, { type OrgUnitCanvasItem } from "@/components/admin/org/OrgUnitCanvasView";
import type { OrgUnitBuilderEnrichmentMap } from "@/lib/org/org-unit-builder-enrichment";
import {
  SCE_DESIGN_SYSTEM_10R7_1_PO,
} from "@/lib/design-system/sce-design-system-10r7-1-po-correction-meta";

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

function mockMatchMedia(finePointer = true) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: finePointer && query.includes("hover: hover"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockNodeRects() {
  Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
    const node = this.getAttribute?.("data-org-unit-node");
    if (node === "unit-a") {
      return {
        top: 100,
        left: 100,
        right: 280,
        bottom: 160,
        width: 180,
        height: 60,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      };
    }
    if (node === "unit-b") {
      return {
        top: 220,
        left: 100,
        right: 280,
        bottom: 280,
        width: 180,
        height: 60,
        x: 100,
        y: 220,
        toJSON: () => ({}),
      };
    }
    return {
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  });
}

function makeUnit(
  id: string,
  name: string,
  parentId: string | null = null,
  childCount = parentId ? 0 : 1,
): OrgUnitCanvasItem {
  return {
    id,
    parentId,
    sortOrder: 0,
    key: id,
    name,
    type: "DIVISION",
    status: "ACTIVE",
    level: parentId ? 1 : 0,
    description: null,
    archivedAt: null,
    _count: { memberships: 0, children: childCount },
  };
}

const unitA = makeUnit("unit-a", "Vereinsleitung", null);
const unitB = makeUnit("unit-b", "Abteilung", "unit-a");

const emptyEnrichment: OrgUnitBuilderEnrichmentMap = {
  "unit-a": {
    primaryMemberships: [],
    teamCount: 0,
    staffCount: 0,
    membershipCount: 0,
    staffAssignments: [],
  },
  "unit-b": {
    primaryMemberships: [],
    teamCount: 0,
    staffCount: 0,
    membershipCount: 0,
    staffAssignments: [],
  },
};

const populatedEnrichment: OrgUnitBuilderEnrichmentMap = {
  "unit-a": {
    primaryMemberships: [
      {
        id: "m1",
        isPrimary: true,
        roleKey: "CLUB_MANAGER",
        person: {
          id: "p-lead",
          firstName: "Lea",
          lastName: "Leitung",
          displayName: "Lea Leitung",
        },
      },
    ],
    teamCount: 1,
    staffCount: 2,
    membershipCount: 1,
    staffAssignments: [
      {
        id: "a1",
        personId: "p-staff-1",
        functionKey: "ACCOUNTANT",
        person: {
          id: "p-staff-1",
          firstName: "Sam",
          lastName: "Staff",
          displayName: "Sam Staff",
        },
        team: null,
      },
      {
        id: "a2",
        personId: "p-staff-2",
        functionKey: "COACH",
        person: {
          id: "p-staff-2",
          firstName: "Kim",
          lastName: "Coach",
          displayName: "Kim Coach",
        },
        team: null,
      },
    ],
  },
  "unit-b": emptyEnrichment["unit-b"],
};

describe("OrgUnitBuilder R7.1 composed hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockMatchMedia(true);
    mockNodeRects();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderBuilder(
    enrichment: OrgUnitBuilderEnrichmentMap = emptyEnrichment,
    selectedViaClick?: "unit-a" | "unit-b",
  ) {
    render(
      <OrgUnitBuilderWorkspace
        tenantId="tenant-1"
        orgUnits={[unitA, unitB]}
        builderEnrichment={enrichment}
        archivedOrgUnits={[]}
        showArchived={false}
        canManage={true}
        parentOptions={[]}
      />,
    );
    if (selectedViaClick) {
      fireEvent.click(screen.getByTestId(`org-unit-node-${selectedViaClick}`));
    }
  }

  async function openPreviewOn(nodeId: "unit-a" | "unit-b") {
    fireEvent.pointerEnter(screen.getByTestId(`org-unit-node-${nodeId}`));
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
  }

  it("opens SceOrgUnitPreviewCard after hover delay on unselected node", async () => {
    renderBuilder();
    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();
    await openPreviewOn("unit-a");
    expect(screen.getByTestId("sce-org-unit-preview-card")).toBeInTheDocument();
    expect(screen.getByText("Keine Zuweisung")).toBeInTheDocument();
    expect(screen.getByText("Noch keine Mitarbeitenden zugeordnet")).toBeInTheDocument();
  });

  it("keeps preview open when pointer moves node → preview (hover bridge)", async () => {
    renderBuilder();
    await openPreviewOn("unit-a");
    const preview = screen.getByTestId("sce-org-unit-preview-card");
    fireEvent.pointerLeave(screen.getByTestId("org-unit-node-unit-a"));
    fireEvent.pointerEnter(preview.closest("[data-org-contextual-preview-root]")!);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId("sce-org-unit-preview-card")).toBeInTheDocument();
  });

  it("closes preview on Escape", async () => {
    renderBuilder();
    await openPreviewOn("unit-a");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();
  });

  it("suppresses duplicate preview on selected node but shows other node preview", async () => {
    renderBuilder(emptyEnrichment, "unit-a");
    await openPreviewOn("unit-a");
    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();

    await openPreviewOn("unit-b");
    const card = screen.getByTestId("sce-org-unit-preview-card");
    expect(within(card).getByRole("heading", { level: 3, name: "Abteilung" })).toBeInTheDocument();
  });

  it("closes preview and selects node B on click", async () => {
    renderBuilder(emptyEnrichment, "unit-a");
    await openPreviewOn("unit-b");
    expect(screen.getByTestId("sce-org-unit-preview-card")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("org-unit-node-unit-b"));
    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();
    expect(screen.getByTestId("org-unit-node-unit-b")).toHaveAttribute("aria-pressed", "true");
  });

  it("renders populated Leitung and Mitarbeitende in preview", async () => {
    renderBuilder(populatedEnrichment);
    await openPreviewOn("unit-a");
    const card = screen.getByTestId("sce-org-unit-preview-card");
    expect(within(card).getByText("Lea Leitung")).toBeInTheDocument();
    expect(within(card).getByText("Sam Staff")).toBeInTheDocument();
  });

  it("suppresses preview during canvas pan", async () => {
    render(
      <OrgUnitCanvasView
        tenantId="tenant-1"
        orgUnits={[unitA, unitB]}
        builderEnrichment={emptyEnrichment}
        canManage={true}
        selectedId={null}
        onSelectId={() => {}}
        onAddChild={() => {}}
      />,
    );
    await openPreviewOn("unit-a");
    expect(screen.getByTestId("sce-org-unit-preview-card")).toBeInTheDocument();
    const viewport = screen.getByTestId("org-unit-canvas-viewport");
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(viewport, { clientX: 10, clientY: 10, pointerId: 1 });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();
  });

  it("opens preview on keyboard focus", async () => {
    renderBuilder();
    fireEvent.focus(screen.getByTestId("org-unit-node-unit-a"));
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.getByTestId("sce-org-unit-preview-card")).toBeInTheDocument();
  });

  it("records R7.1 PO readiness metadata", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_1_PO.SCE_DESIGN_SYSTEM_10R7_1_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R7_1_PO.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
  });
});
