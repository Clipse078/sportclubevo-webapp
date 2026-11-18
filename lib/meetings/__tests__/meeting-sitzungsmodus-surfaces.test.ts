import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("meeting sitzungsmodus surfaces", () => {
  it("uses page-wide focus experience without modal primitives", () => {
    const focus = read("components/admin/meetings/workspace/MeetingSitzungsmodusFocusExperience.tsx");
    expect(focus).not.toMatch(/\bDialog\b/);
    expect(focus).not.toContain("fixed inset-0");
    expect(focus).toContain("meeting-sitzungsmodus-topic-select");
    expect(focus).toContain("meeting-sitzungsmodus-agenda-sidebar");
    expect(focus).toContain("meeting-sitzungsmodus-exit-focus");
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

  it("renders focus inside workspace shell, not instead of provider children tree", () => {
    const shell = read("components/admin/meetings/workspace/MeetingWorkspaceSitzungsmodusShell.tsx");
    expect(shell).toContain("MeetingSitzungsmodusFocusExperience");
    expect(shell).toContain("<>{children}</>");
  });
});