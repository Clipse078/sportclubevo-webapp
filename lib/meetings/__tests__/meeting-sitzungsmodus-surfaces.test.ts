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
  });

  it("gates timer provider on meetings manage scope", () => {
    const workspace = read("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).toContain("MeetingAgendaTimerProvider");
    expect(workspace).toContain("timerScope && canManage");
  });
});