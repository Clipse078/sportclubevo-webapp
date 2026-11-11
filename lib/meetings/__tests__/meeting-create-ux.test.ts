import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R1 meeting creation UX", () => {
  it("uses full-page create entry instead of modal composer", () => {
    expect(readSrc("components/admin/meetings/CreateMeetingTrigger.tsx")).toContain(
      'href="/vereinsleitung/meetings/new"',
    );
    expect(readSrc("components/admin/meetings/CreateMeetingTrigger.tsx")).toContain(
      'data-sce-create-flow="page"',
    );
    expect(readSrc("app/(admin)/vereinsleitung/meetings/new/page.tsx")).toContain('layout="page"');
    expect(readSrc("components/admin/meetings/MeetingForm.tsx")).toContain("Erweiterte Einstellungen");
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
