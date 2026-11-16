import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  openPhaseAssignmentOptions,
  partitionSprintsForUmsetzungsplanung,
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

  it("wires consolidated workspace without modal planning shell", () => {
    const client = read("components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx");
    expect(client).toContain("UmsetzungsplanungWorkspace");
    expect(client).not.toContain("DevelopmentSprintList");
    const workspace = read("components/admin/club-development/UmsetzungsplanungWorkspace.tsx");
    expect(workspace).toContain("details");
    expect(workspace).toContain("UmsetzungsplanungUnplannedPanel");
    expect(workspace).not.toContain("Dialog");
  });

  it("keeps dedicated Aufgabenboard deep link on phase cards", () => {
    expect(read("components/admin/club-development/UmsetzungsplanungPhaseCard.tsx")).toContain("SprintBoardQuickLink");
    expect(read("lib/club-development/product-copy.ts")).toContain(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY_MARKER);
  });

  it("lazy-loads assigned tasks inline on phase expand", () => {
    const phaseCard = read("components/admin/club-development/UmsetzungsplanungPhaseCard.tsx");
    expect(phaseCard).toContain("UmsetzungsplanungPhaseAssignedTasksPanel");
    const panel = read("components/admin/club-development/UmsetzungsplanungPhaseAssignedTasksPanel.tsx");
    expect(panel).toContain("/api/club-development/sprints/");
    expect(panel).toContain("SprintTaskTitleLink");
    expect(panel).toContain("SprintTaskAssigneeDisplay");
    expect(panel).toContain("initiativeLabel");
  });
});

const CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY_MARKER = "CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY";