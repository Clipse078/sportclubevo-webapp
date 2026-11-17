import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Vereinsentwicklung visual surfaces — interaction regressions", () => {
  it("Strategie Schwerpunkte hide redundant badge inside Schwerpunkte section", () => {
    const panel = read("components/admin/club-development/StrategyAuthoringPanel.tsx");
    expect(panel).toContain("showFocusBadge={false}");
    expect(panel).not.toContain("focusHint");
  });

  it("Sitzungen list uses inline collapsible create with dirty-close provider", () => {
    const create = read("components/admin/meetings/CreateMeetingInlineCollapsibleCard.tsx");
    const client = read("components/admin/vereinsleitung/VereinsleitungMeetingsWorkspaceClient.tsx");
    const trigger = read("components/admin/meetings/CreateMeetingTrigger.tsx");
    expect(create).toContain("SceClubDevelopmentContextualCreateCollapsibleShell");
    expect(create).toContain("SceClubDevelopmentInlineDirtyCloseProvider");
    expect(create).toContain("MeetingForm");
    expect(client).toContain("CreateMeetingInlineCollapsibleCard");
    expect(trigger).toContain("CreateMeetingListTrigger");
    expect(trigger).toContain("MEETINGS_INLINE_CREATE_EVENT");
  });

  it("Ziele workspace create preserves draft shell pattern", () => {
    const card = read("components/admin/targets/CreateTargetWorkspaceCollapsibleCard.tsx");
    expect(card).toContain("SceClubDevelopmentInlineDirtyCloseProvider");
    expect(card).toContain("guardedExpandedChange");
  });

  it("Vorhaben card uses Aufgaben label without Wurzel copy", () => {
    const card = read("components/admin/club-development/VorhabenCollapsibleCard.tsx");
    expect(card).toContain("tasksSubheading");
    expect(card).not.toContain("Wurzel-Aufgaben");
    const vorhabenControl = read("components/admin/club-development/VorhabenPrioritaetenControl.tsx");
    expect(vorhabenControl).not.toContain("Ausklappbare Vorhaben mit zugehörigen Aufgaben");
  });

  it("meeting workspace consolidates summary and removes duplicate lifecycle pill in title", () => {
    const header = read("components/admin/meetings/workspace/MeetingWorkspaceHeader.tsx");
    expect(header).not.toContain("MeetingHeaderTitleBlock title={title} lifecycleLabel");
    const workspace = read("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).toContain("meeting-workspace-summary");
  });

  it("meeting Sitzungsübersicht keeps rounded shell overflow while actions menu uses Popover", () => {
    const styles = read("components/admin/club-development/sce-club-development-surface-styles.ts");
    const statusBar = read("components/admin/meetings/workspace/MeetingWorkspaceStatusBar.tsx");
    expect(styles).toContain("overflow-hidden");
    expect(statusBar).toContain("PopoverContent");
  });
});