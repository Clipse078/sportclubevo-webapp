import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  meetingProtocolPrintDraftHint,
  meetingProtocolPrintPath,
  meetingProtocolPrintUnavailableReason,
} from "../meeting-protocol-print";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-03R4 — discoverable protocol print (UAT)", () => {
  it("exposes canonical print path per meeting slug", () => {
    expect(meetingProtocolPrintPath("test-sitzung-ii")).toBe(
      "/vereinsleitung/meetings/test-sitzung-ii/protokoll",
    );
  });

  it("keeps print in workspace secondary menu for planned and completed meetings", () => {
    const statusBar = readSrc("components/admin/meetings/workspace/MeetingWorkspaceStatusBar.tsx");
    expect(statusBar).toContain("Protokoll drucken");
    expect(statusBar).toContain("meeting-print-protocol");
    expect(statusBar).toContain("meetingProtocolPrintPath");
    expect(statusBar).not.toMatch(/meeting\.status === "COMPLETED"\s*\?\s*\(/);
  });

  it("explains when print is unavailable instead of hiding the action", () => {
    expect(meetingProtocolPrintUnavailableReason("CANCELLED")).toMatch(/abgesagte/i);
    expect(meetingProtocolPrintUnavailableReason("PLANNED")).toBeNull();
    expect(meetingProtocolPrintDraftHint("PLANNED")).toMatch(/Entwurf/i);
  });

  it("includes decision rationale and action outcome in print view", () => {
    const printView = readSrc("components/admin/meetings/workspace/MeetingProtocolPrintView.tsx");
    expect(printView).toContain("Begründung:");
    expect(printView).toContain("Ziel:");
    expect(printView).toContain("d.rationale");
    expect(printView).toContain("a.expectedOutcome");
  });
});
