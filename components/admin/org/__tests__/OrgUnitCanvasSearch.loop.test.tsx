/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import OrgUnitBuilderWorkspace from "@/components/admin/org/OrgUnitBuilderWorkspace";
import type { OrgUnitCanvasItem } from "@/components/admin/org/OrgUnitCanvasView";
import type { OrgUnitBuilderEnrichmentMap } from "@/lib/org/org-unit-builder-enrichment";

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

function mockViewportGeometry() {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      if (this.getAttribute?.("data-testid") === "org-unit-canvas-viewport") return 960;
      return 400;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      if (this.getAttribute?.("data-testid") === "org-unit-canvas-viewport") return 640;
      return 300;
    },
  });
}

function makeUnit(
  id: string,
  name: string,
  parentId: string | null,
  childCount = 0,
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

const root = makeUnit("root", "Verein", null, 1);
const juniors = makeUnit("juniors", "Junioren", "root");
const enrichment: OrgUnitBuilderEnrichmentMap = {
  root: {
    primaryMemberships: [],
    teamCount: 0,
    staffCount: 0,
    membershipCount: 0,
    staffAssignments: [],
  },
  juniors: {
    primaryMemberships: [],
    teamCount: 0,
    staffCount: 0,
    membershipCount: 0,
    staffAssignments: [],
  },
};

describe("OrgUnit canvas search viewport loop regression", () => {
  beforeEach(() => {
    mockViewportGeometry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not exceed React update depth when searching after fit-all and with inspector open", async () => {
    const depthErrors: string[] = [];
    const origConsoleError = console.error;
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      const msg = args.map(String).join(" ");
      if (msg.includes("Maximum update depth exceeded")) {
        depthErrors.push(msg);
      }
      origConsoleError(...args);
    });

    render(
      <OrgUnitBuilderWorkspace
        tenantId="tenant-loop-test"
        orgUnits={[root, juniors]}
        builderEnrichment={enrichment}
        archivedOrgUnits={[]}
        showArchived={false}
        canManage={true}
        parentOptions={[]}
      />,
    );

    fireEvent.click(screen.getByTestId("org-canvas-fit"));
    await act(async () => {});

    const search = screen.getByTestId("org-canvas-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "jun" } });
    await act(async () => {});
    expect(screen.getByTestId("org-unit-node-juniors")).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(search, { target: { value: "juni" } });
    await act(async () => {});
    fireEvent.change(search, { target: { value: "" } });
    await act(async () => {});
    fireEvent.change(search, { target: { value: "jun" } });
    await act(async () => {});

    expect(depthErrors).toEqual([]);
    expect(screen.getByTestId("org-unit-canvas-shell")).toBeInTheDocument();
  });
});