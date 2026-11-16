import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { groupAssignedSprintBoardCards } from "../sprints/umsetzungsplanung-assigned-tasks";
import {
  applyUmsetzungsplanungSectionDeepLink,
  countUmsetzungsplanungBuckets,
  openPhaseAssignmentOptions,
  partitionSprintsForUmsetzungsplanung,
  parseUmsetzungsplanungSectionFocus,
  resolveUmsetzungsplanungSectionOpenDefaults,
} from "../sprints/umsetzungsplanung-workspace";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Umsetzungsplanung workspace", () => {
  it("partitions sprints into active, planned, and completed buckets", () => {
    const buckets = partitionSprintsForUmsetzungsplanung([
      { id: "1", status: "COMPLETED", endsAt: "2026-01-01", startsAt: "2025-12-01" },
      { id: "2", status: "ACTIVE", endsAt: null, startsAt: "2026-02-01" },
      { id: "3", status: "PLANNED", endsAt: null, startsAt: "2026-03-01" },
      { id: "4", status: "PLANNED", endsAt: null, startsAt: "2026-02-15" },
    ]);
    expect(buckets.active.map((s) => s.id)).toEqual(["2"]);
    expect(buckets.planned.map((s) => s.id)).toEqual(["4", "3"]);
    expect(buckets.completed.map((s) => s.id)).toEqual(["1"]);
  });

  it("exposes only open phases for bulk assignment targets", () => {
    const buckets = partitionSprintsForUmsetzungsplanung([
      { id: "a", slug: "a", title: "Laufend", status: "ACTIVE" },
      { id: "p", slug: "p", title: "Geplant", status: "PLANNED" },
      { id: "c", slug: "c", title: "Fertig", status: "COMPLETED" },
    ]);
    const options = openPhaseAssignmentOptions(buckets);
    expect(options.map((o) => o.id)).toEqual(["a", "p"]);
  });

  it("opens unplanned work by default when no open phase exists for planners", () => {
    const buckets = partitionSprintsForUmsetzungsplanung([
      { id: "1", status: "COMPLETED", endsAt: "2026-01-01", startsAt: "2025-12-01" },
    ]);
    const counts = countUmsetzungsplanungBuckets(buckets);
    expect(counts).toEqual({ ongoing: 0, planned: 0, completed: 1 });
    const defaults = resolveUmsetzungsplanungSectionOpenDefaults(counts, true);
    expect(defaults.unplanned).toBe(true);
    expect(defaults.planned).toBe(false);
    expect(defaults.completed).toBe(false);
  });

  it("honours deep-link section focus without forcing other sections closed", () => {
    const counts = { ongoing: 0, planned: 0, completed: 2 };
    const merged = applyUmsetzungsplanungSectionDeepLink(
      resolveUmsetzungsplanungSectionOpenDefaults(counts, true),
      parseUmsetzungsplanungSectionFocus("abgeschlossen"),
    );
    expect(merged.completed).toBe(true);
    expect(merged.unplanned).toBe(true);
  });

  it("groups assigned tasks by Vorhaben and status", () => {
    const grouped = groupAssignedSprintBoardCards(
      [
        {
          taskId: "t1",
          title: "Alpha",
          status: "OPEN",
          column: "OPEN",
          priority: "NORMAL",
          dueAt: null,
          assignees: [],
          initiativeLabel: "Vorhaben A",
          initiativeId: "i1",
          addedAfterSprintStart: false,
        },
        {
          taskId: "t2",
          title: "Beta",
          status: "IN_PROGRESS",
          column: "IN_PROGRESS",
          priority: "NORMAL",
          dueAt: null,
          assignees: [],
          initiativeLabel: "Vorhaben A",
          initiativeId: "i1",
          addedAfterSprintStart: false,
        },
      ],
      { OPEN: "Offen", IN_PROGRESS: "In Arbeit", DONE: "Erledigt", CANCELLED: "Abgebrochen" },
    );
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.byStatus.map((s) => s.status)).toEqual(["OPEN", "IN_PROGRESS"]);
  });

  it("wires consolidated workspace without modal planning shell", () => {
    const client = read("components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx");
    expect(client).toContain("UmsetzungsplanungWorkspace");
    expect(client).not.toContain("DevelopmentSprintList");
    const workspace = read("components/admin/club-development/UmsetzungsplanungWorkspace.tsx");
    expect(workspace).toContain("UmsetzungsplanungCollapsibleSection");
    expect(workspace).toContain("UmsetzungsplanungUnplannedPanel");
    expect(workspace).not.toContain("Dialog");
    expect(workspace).not.toContain("SceClubDevelopmentEmptyState");
  });

  it("keeps dedicated Aufgabenboard deep link on phase cards", () => {
    expect(read("components/admin/club-development/UmsetzungsplanungPhaseCard.tsx")).toContain("SprintBoardQuickLink");
    expect(read("lib/club-development/product-copy.ts")).toContain("CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY");
  });

  it("lazy-loads assigned tasks inline on phase expand with reassignment affordances", () => {
    const phaseCard = read("components/admin/club-development/UmsetzungsplanungPhaseCard.tsx");
    expect(phaseCard).toContain("UmsetzungsplanungPhaseAssignedTasksPanel");
    const panel = read("components/admin/club-development/UmsetzungsplanungPhaseAssignedTasksPanel.tsx");
    expect(panel).toContain("/api/club-development/sprints/");
    expect(panel).toContain("SprintTaskTitleLink");
    expect(panel).toContain("SprintTaskAssigneeDisplay");
    expect(panel).toContain("removeAssignmentAction");
    expect(panel).toContain("moveSelectedTasksAction");
    expect(panel).toContain("groupAssignedSprintBoardCards");
  });

  it("exposes Phase erstellen beside planned empty state", () => {
    const workspace = read("components/admin/club-development/UmsetzungsplanungWorkspace.tsx");
    expect(workspace).toContain("createPhaseAction");
    expect(workspace).toContain("openForm");
  });
});