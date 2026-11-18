import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("guided meeting capture UX", () => {
  it("uses copper primary for Sitzungsmodus summary action", () => {
    const header = read("components/admin/meetings/workspace/MeetingWorkspaceHeader.tsx");
    expect(header).toContain("MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS");
    expect(read("lib/meetings/meeting-sitzungsmodus-primary-action-styles.ts")).toContain("#99501F");
    expect(header).toContain("Play");
  });

  it("uses copper primary for Sitzungsmodus Protokollnotizen save", () => {
    const focus = read("components/admin/meetings/workspace/MeetingSitzungsmodusFocusExperience.tsx");
    expect(focus).toContain("notesSavePrimaryButtonClass={MEETING_SITZUNGSMODUS_PRIMARY_ACTION_CLASS}");
    const notes = read("components/admin/meetings/workspace/MeetingTraktandumAgendaNotes.tsx");
    expect(notes).toContain("notesSavePrimaryButtonClass");
    expect(notes).toContain("notesSavePrimaryButtonClass = workspacePrimaryButtonClass");
  });

  it("uses unified Was halten wir fest capture surface", () => {
    const actions = read("components/admin/meetings/workspace/MeetingTraktandumOutcomeActions.tsx");
    expect(actions).toContain("MEETING_CAPTURE_SURFACE_HEADING");
    expect(actions).toContain("MEETING_DECISION_DECISION_FIELD_LABEL");
    expect(actions).not.toContain("outcome-legend");
    expect(actions).toContain("-outcome-${kind}-trigger");
  });

  it("wires inline outcome delete from Ergebnisse list", () => {
    const list = read("components/admin/meetings/workspace/MeetingTraktandumErgebnisseList.tsx");
    expect(list).toContain("MeetingOutcomeMoreActionsMenu");
    expect(list).toContain("buildAgendaItemErgebnisseDisplayNodes");
  });

  it("does not duplicate Sitzungsmodus start inside Traktanden toolbar", () => {
    const sections = read("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).not.toContain("MeetingSitzungsmodusStartButton");
  });
});