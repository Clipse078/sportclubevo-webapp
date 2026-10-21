/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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

function mockMatchMediaNoHover() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

function makeUnit(id: string, name: string, parentId: string | null = null): OrgUnitCanvasItem {
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
    _count: { memberships: 0, children: parentId ? 0 : 1 },
  };
}

const unitA = makeUnit("unit-a", "Vereinsleitung", null);
const emptyEnrichment: OrgUnitBuilderEnrichmentMap = {
  "unit-a": {
    primaryMemberships: [],
    teamCount: 0,
    staffCount: 0,
    membershipCount: 0,
    staffAssignments: [],
  },
};

describe("OrgUnitBuilder R7.2 composed hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockMatchMediaNoHover();
    mockNodeRects();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function openPreviewOn(nodeId: string) {
    fireEvent.pointerEnter(screen.getByTestId(`org-unit-node-${nodeId}`), {
      pointerType: "mouse",
    });
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
  }

  it("shows preview DOM when matchMedia hover capability is false but pointer is mouse", async () => {
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

    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();
    await openPreviewOn("unit-a");

    const previewRoot = document.querySelector("[data-org-contextual-preview-root]");
    expect(previewRoot).not.toBeNull();
    expect(screen.getByTestId("sce-org-unit-preview-card")).toBeVisible();
    expect(within(screen.getByTestId("sce-org-unit-preview-card")).getByRole("heading", { level: 3, name: "Vereinsleitung" })).toBeInTheDocument();
  });

  it("does not open preview for touch pointer", async () => {
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

    fireEvent.pointerEnter(screen.getByTestId("org-unit-node-unit-a"), { pointerType: "touch" });
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.queryByTestId("sce-org-unit-preview-card")).toBeNull();
  });
});
