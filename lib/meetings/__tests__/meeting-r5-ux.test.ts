import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R5 meetings UX", () => {
  it("uses inline multi person picker without selector sheet on create", () => {
    const picker = readSrc("components/admin/meetings/MeetingParticipantMultiPicker.tsx");
    expect(picker).toContain("SceInlineMultiPersonPicker");
    expect(picker).not.toContain("SceChipMultiSelectorField");
    expect(picker).not.toContain('panelHost="sheet"');
  });

  it("uses inline people search for single pickers in meetings workspace", () => {
    const peoplePicker = readSrc("components/shared/PeoplePicker.tsx");
    expect(peoplePicker).toContain("PeoplePickerLegacySearch");
    expect(peoplePicker).not.toContain("SceInlineSinglePersonPicker");
  });

  it("uses inline collapsible task creation for meeting Aufgaben panel", () => {
    expect(readSrc("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx")).toContain(
      "ContextualTaskInlineCreateCard",
    );
    expect(readSrc("components/admin/aufgaben/contextual/MeetingContextualTaskInlineCreateCard.tsx")).toContain(
      "ContextualTaskInlineCreateCard",
    );
    expect(readSrc("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx")).not.toMatch(
      /import ContextualTaskCreateDialog/,
    );
    expect(readSrc("app/(admin)/vereinsleitung/meetings/[slug]/page.tsx")).toContain(
      "MeetingTaskCreateScrollLink",
    );
  });
});
