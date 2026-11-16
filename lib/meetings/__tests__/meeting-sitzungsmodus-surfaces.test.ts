import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("meeting sitzungsmodus surfaces", () => {
  it("uses inline collapsible focus card without modal primitives", () => {
    const panel = read("components/admin/meetings/workspace/MeetingSitzungsmodusPanel.tsx");
    expect(panel).toContain("SceClubDevelopmentContextualCreateCollapsibleShell");
    expect(panel).not.toMatch(/\bDialog\b/);
    expect(panel).not.toContain("fixed inset-0");
    expect(panel).toContain("meeting-sitzungsmodus-topic-select");
    expect(panel).toContain("w-full min-w-0");
  });

  it("sticky timer defers to focus-card visibility", () => {
    const sticky = read("components/admin/meetings/workspace/MeetingSitzungsmodusStickyTimer.tsx");
    expect(sticky).toContain("focusCardInView");
    expect(sticky).not.toContain("left-0 right-0 border-b px-4 py-2");
  });

  it("gates timer provider on meetings manage scope", () => {
    const workspace = read("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).toContain("MeetingAgendaTimerProvider");
    expect(workspace).toContain("timerScope && canManage");
  });
});