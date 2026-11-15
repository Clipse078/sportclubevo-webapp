import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R3 meeting creation UX", () => {
  it("does not ship legacy modal composer component", () => {
    expect(() => readSrc("components/admin/meetings/CreateMeetingComposerDialog.tsx")).toThrow();
  });

  it("uses inline collapsible create on the list with deep-link /new fallback route", () => {
    expect(readSrc("components/admin/meetings/CreateMeetingInlineCollapsibleCard.tsx")).toContain(
      'data-sce-create-flow="inline-collapsible"',
    );
    expect(readSrc("components/admin/meetings/CreateMeetingTrigger.tsx")).toContain(
      "MEETINGS_INLINE_CREATE_EVENT",
    );
    expect(readSrc("components/admin/vereinsleitung/VereinsleitungMeetingsWorkspaceClient.tsx")).toContain(
      "CreateMeetingInlineCollapsibleCard",
    );
    expect(readSrc("app/(admin)/vereinsleitung/meetings/new/page.tsx")).toContain('layout="page"');
    expect(readSrc("components/admin/meetings/MeetingForm.tsx")).toContain("Erweiterte Einstellungen");
    expect(readSrc("components/admin/meetings/MeetingForm.tsx")).toContain("MeetingParticipantMultiPicker");
    expect(readSrc("components/admin/meetings/MeetingForm.tsx")).not.toContain("Teilnehmeranzahl");
    expect(readSrc("components/admin/meetings/MeetingForm.tsx")).toContain(
      'defaultValues?.visibilityScope ?? "RESTRICTED"',
    );
    expect(readSrc("app/api/meetings/route.ts")).toContain("resolveMeetingVisibilityOnCreate");
  });

  it("wires people pickers in workspace sections", () => {
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx")).toContain(
      "MeetingWorkspacePeopleField",
    );
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx")).toContain("ownerPersonId");
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx")).toContain(
      "MeetingInitiativeLinkSelect",
    );
  });
});