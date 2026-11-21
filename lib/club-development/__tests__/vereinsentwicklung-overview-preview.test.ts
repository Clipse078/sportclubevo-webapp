import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  compareVereinsentwicklungOverviewNewestFirst,
  takeVereinsentwicklungOverviewPreview,
  VEREINSENTWICKLUNG_OVERVIEW_PREVIEW_LIMIT,
  loadVereinsentwicklungOverviewPreview,
} from "../vereinsentwicklung-overview-preview";
import { filterTargetsForOrgEinheit } from "../vereinsentwicklung-leadership-dashboard";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "../vereinsentwicklung-connected-workspace";
import { buildConnectedWorkspaceHref } from "../vereinsentwicklung-connected-workspace";

const listClubStrategies = vi.fn();
const loadStrategyOverview = vi.fn();
const loadVorhabenWorkspace = vi.fn();

vi.mock("../club-strategy-service", () => ({
  listClubStrategies: (...args: unknown[]) => listClubStrategies(...args),
}));

vi.mock("../strategy-overview", () => ({
  loadStrategyOverview: (...args: unknown[]) => loadStrategyOverview(...args),
}));

vi.mock("../vorhaben-workspace", () => ({
  loadVorhabenWorkspace: (...args: unknown[]) => loadVorhabenWorkspace(...args),
}));

vi.mock("../sprints/queries", () => ({
  hasSprintManagePermission: () => true,
}));

function actor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: [
      PERMISSIONS.TARGETS_VIEW,
      PERMISSIONS.TARGETS_MANAGE,
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.INITIATIVES_VIEW,
    ],
    orgUnitIds: [],
    personId: null,
    roleKeys: [],
    teamIds: [],
    ...overrides,
  } as ActorContext;
}

describe("vereinsentwicklung overview preview ordering", () => {
  it("sorts newest createdAt first with id tie-breaker", () => {
    const rows = [
      { id: "b", createdAt: "2025-01-02T00:00:00.000Z" },
      { id: "a", createdAt: "2025-01-03T00:00:00.000Z" },
      { id: "c", createdAt: "2025-01-03T00:00:00.000Z" },
    ];
    expect(rows.sort(compareVereinsentwicklungOverviewNewestFirst).map((r) => r.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it(`limits to ${VEREINSENTWICKLUNG_OVERVIEW_PREVIEW_LIMIT} after full scope`, () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      id: `id-${index}`,
      createdAt: new Date(2025, 0, index + 1).toISOString(),
    }));
    const preview = takeVereinsentwicklungOverviewPreview(rows);
    expect(preview).toHaveLength(VEREINSENTWICKLUNG_OVERVIEW_PREVIEW_LIMIT);
    expect(preview[0]?.id).toBe("id-4");
  });
});

describe("loadVereinsentwicklungOverviewPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listClubStrategies.mockResolvedValue([
      { id: "s-old", createdAt: "2024-01-01T00:00:00.000Z", title: "Old" },
      { id: "s-new", createdAt: "2025-06-01T00:00:00.000Z", title: "New" },
      { id: "s-mid", createdAt: "2025-01-01T00:00:00.000Z", title: "Mid" },
      { id: "s-extra", createdAt: "2025-05-01T00:00:00.000Z", title: "Extra" },
    ]);
    loadStrategyOverview.mockResolvedValue({
      targets: [
        { id: "t-global", createdAt: "2025-01-01T00:00:00.000Z", title: "Global" },
        { id: "t-jun", createdAt: "2025-06-02T00:00:00.000Z", title: "Junioren" },
      ],
    });
    loadVorhabenWorkspace.mockResolvedValue({
      canViewTasks: true,
      tasks: [
        {
          id: "task-1",
          createdAt: "2025-02-01T00:00:00.000Z",
          title: "Task",
          status: "OPEN",
          statusLabel: "Offen",
          assigneeLabels: [],
        },
      ],
    });
  });

  it("applies org scope before limiting targets", async () => {
    const org = { id: "ou-jun", label: "Junioren" };
    const targetsForOrgScope = [
      { id: "t-global", visibleOrgUnitRefs: ["ou-club"] },
      { id: "t-jun", visibleOrgUnitRefs: ["ou-jun"] },
    ] as Parameters<typeof filterTargetsForOrgEinheit>[0];

    const result = await loadVereinsentwicklungOverviewPreview({
      actor: actor(),
      orgEinheit: org,
      targetsForOrgScope,
    });

    expect(filterTargetsForOrgEinheit(targetsForOrgScope, org).map((t) => t.id)).toEqual(["t-jun"]);
    expect(result.targets.map((t) => t.id)).toEqual(["t-jun"]);
    expect(listClubStrategies).toHaveBeenCalledWith(expect.anything(), { orgUnitId: "ou-jun" });
    expect(loadVorhabenWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      { orgUnitId: "ou-jun" },
      expect.objectContaining({ taskOrder: "createdAtDesc" }),
    );
  });

  it("returns empty sections when actor lacks connected-view permissions", async () => {
    const result = await loadVereinsentwicklungOverviewPreview({
      actor: actor({ permissionKeys: [PERMISSIONS.MEETINGS_VIEW] }),
      orgEinheit: null,
      targetsForOrgScope: [],
    });
    expect(result.showStrategien).toBe(false);
    expect(result.showZiele).toBe(false);
    expect(result.showAufgaben).toBe(false);
    expect(result.strategies).toEqual([]);
    expect(listClubStrategies).not.toHaveBeenCalled();
  });

  it("returns up to three newest strategies", async () => {
    const result = await loadVereinsentwicklungOverviewPreview({
      actor: actor(),
      orgEinheit: null,
      targetsForOrgScope: [],
    });
    expect(result.strategies.map((s) => s.id)).toEqual(["s-new", "s-extra", "s-mid"]);
  });
});

describe("overview scoped Alle anzeigen links", () => {
  it("preserves orgEinheit query param", () => {
    const orgQuery = { [CD_WORKSPACE_ORG_UNIT_QUERY]: "ou-jun" };
    expect(buildConnectedWorkspaceHref("strategien", orgQuery)).toContain(
      `${CD_WORKSPACE_ORG_UNIT_QUERY}=ou-jun`,
    );
    expect(buildConnectedWorkspaceHref("ziele", orgQuery)).toContain("ansicht=ziele");
    expect(buildConnectedWorkspaceHref("aufgaben", orgQuery)).toContain("ansicht=aufgaben");
  });
});