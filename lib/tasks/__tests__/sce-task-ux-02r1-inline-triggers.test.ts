import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-TASK-UX-02R1 contextual record triggers", () => {
  it("trigger supports inline panel activation", () => {
    const trigger = read("components/admin/aufgaben/contextual/ContextualTaskCreateTrigger.tsx");
    expect(trigger).toContain('activation = "navigate"');
    expect(trigger).toContain("dispatchContextualTaskInlineCreate");
  });

  it("related panel listens for scoped inline open events", () => {
    const panel = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(panel).toContain("CONTEXTUAL_TASK_INLINE_CREATE_EVENT");
    expect(panel).toContain("detail?.contextId !== contextId");
  });

  it("record surfaces with contextual Aufgaben panel use inlinePanel", () => {
    for (const rel of [
      "components/admin/matchcenter/MatchcenterDetail.tsx",
      "app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx",
      "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx",
      "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
      "app/(admin)/dashboard/persons/[id]/page.tsx",
    ]) {
      expect(read(rel)).toContain('activation="inlinePanel"');
    }
  });
});
