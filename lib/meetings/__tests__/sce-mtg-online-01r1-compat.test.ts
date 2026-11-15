import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-MTG-ONLINE-01R1 display codec propagation", () => {
  it("read surfaces decode location via shared display codec", () => {
    for (const rel of [
      "components/admin/meetings/workspace/MeetingWorkspaceDetailsSection.tsx",
      "components/admin/vereinsleitung/VereinsleitungMeetingsList.tsx",
      "components/admin/club-development/ClubDevelopmentOverview.tsx",
      "lib/communication/context-resolver.ts",
    ]) {
      const src = read(rel);
      expect(src).toContain("formatMeetingLocationDisplay");
    }
  });

  it("protocol print receives preformatted metadata rows", () => {
    const print = read("components/admin/meetings/workspace/MeetingProtocolPrintView.tsx");
    expect(print).toContain("metadataRows");
    expect(print).not.toContain("meeting.location");
  });
});