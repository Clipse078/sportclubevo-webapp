import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-TASK-UX-02 — compact task assignee picker", () => {
  it("uses inline TASK_ASSIGNMENT discover search instead of selector sheets", () => {
    const picker = read("components/admin/aufgaben/TaskPeopleMultiPicker.tsx");
    const inline = read("components/sce/list-selector/SceInlineTaskAssigneeMultiPicker.tsx");
    expect(picker).toContain("SceInlineTaskAssigneeMultiPicker");
    expect(inline).toContain("/api/sce/selector/discover");
    expect(inline).toContain("authContext=TASK_ASSIGNMENT");
    expect(inline).not.toContain("SceListSelectorPanel");
    expect(inline).not.toContain("SCE_SELECTOR_CATEGORY_TABS");
  });

  it("meeting inline create shares the contextual form without legacy meeting form", () => {
    const meeting = read("components/admin/aufgaben/contextual/MeetingContextualTaskInlineCreateCard.tsx");
    expect(meeting).toContain("ContextualTaskInlineCreateCard");
    expect(meeting).not.toContain("ContextualTaskCreateFormBody");
  });
});
