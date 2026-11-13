import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-TASK-UX-02 — contextual inline task create", () => {
  it("shared contextual panel uses collapsible inline card for all contexts", () => {
    const panel = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(panel).toContain("ContextualTaskInlineCreateCard");
    expect(panel).not.toContain("ContextualTaskCreateTrigger");
    expect(panel).toContain("context-related-tasks-inline-toggle");
  });

  it("meeting workspace keeps meeting-specific inline card wrapper", () => {
    const wrapper = read("components/admin/aufgaben/contextual/MeetingContextualTaskInlineCreateCard.tsx");
    expect(wrapper).toContain("ContextualTaskInlineCreateCard");
    expect(wrapper).toContain("meeting-contextual-task-inline-create-card");
  });

  it("inline create reuses canonical form hook and body", () => {
    const card = read("components/admin/aufgaben/contextual/ContextualTaskInlineCreateCard.tsx");
    expect(card).toContain("useContextualTaskCreateForm");
    expect(card).toContain("ContextualTaskCreateFormBody");
    expect(card).toContain("clearDraft");
    expect(card).not.toMatch(/import ContextualTaskCreateDialog from/);
  });
});
