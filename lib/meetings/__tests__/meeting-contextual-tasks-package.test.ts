import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("meeting contextual Aufgabe package", () => {
  it("reuses canonical Task create (no parallel MeetingAction task status)", () => {
    expect(read("components/admin/meetings/workspace/MeetingTraktandumAufgabeCreate.tsx")).toContain(
      "MeetingContextualTaskInlineCreateCard",
    );
    expect(read("lib/meetings/meeting-decision-tasks.ts")).toContain("createTaskWithContextDefaults");
    expect(read("lib/meetings/load-meeting-pendenzen.ts")).toContain("TaskContextType.MEETING");
  });

  it("persists Traktandum linkage via occurrence key + shared submit guard", () => {
    expect(read("lib/meetings/meeting-traktandum-task-link.ts")).toContain("sce-mtg-traktandum-task");
    expect(read("lib/meetings/meeting-traktandum-aufgabe-submit.ts")).toContain("inflight");
    expect(read("components/admin/meetings/workspace/MeetingTraktandumAufgabeCreate.tsx")).toContain(
      "agendaItemId",
    );
  });

  it("surfaces Aufgabe erstellen on guided Traktandum surfaces", () => {
    const outcomes = read("components/admin/meetings/workspace/MeetingTraktandumOutcomeActions.tsx");
    expect(outcomes).toContain("Aufgabe erstellen");
    expect(outcomes).toContain("Aufgabe dazu erstellen");
    expect(outcomes).not.toContain("Dialog");
  });
});