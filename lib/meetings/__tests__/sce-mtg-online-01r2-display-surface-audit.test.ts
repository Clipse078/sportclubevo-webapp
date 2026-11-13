import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatMeetingLocationDisplay,
  serializeMeetingLocation,
} from "../meeting-presence-location";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-MTG-ONLINE-01R2 display surface audit", () => {
  it("decodes hybrid codec for command-center meeting venue paths", () => {
    const hybrid = serializeMeetingLocation({
      format: "HYBRID",
      onsiteLabel: "Sekretariat",
      onlineUrl: "https://teams.microsoft.com/l/meetup",
    });
    expect(formatMeetingLocationDisplay(hybrid)).toContain("Hybrid");
    const cc = read("lib/dashboard/command-center.ts");
    expect(cc).toContain("formatMeetingLocationDisplay");
    expect(cc).not.toMatch(/location: meeting\.location(?!\s*\?)/);
  });

  it("meeting programme canonical presentation receives decoded location", () => {
    const adapter = read("lib/personal-agenda/adapters/meeting-programme-adapter.ts");
    expect(adapter).toMatch(/formatMeetingLocationDisplay\(meeting\.location\)/);
  });

  it("MeetingForm writer preserves codec via serializeMeetingLocation", () => {
    const form = read("components/admin/meetings/MeetingForm.tsx");
    expect(form).toContain("serializeMeetingLocation");
    expect(form).toContain("parseMeetingLocation");
  });
});

describe("SCE-MTG-ONLINE route-lifecycle governance evidence", () => {
  it("documents path-filter exclusion for PR #968 HEAD file set", () => {
    const workflow = read(".github/workflows/route-lifecycle-governance.yml");
    expect(workflow).toContain('paths:');
    expect(workflow).toContain('"app/**"');
    expect(workflow).not.toContain('"lib/meetings/**"');
    expect(workflow).not.toContain('"components/admin/meetings/**"');
    const changedPaths = [
      "lib/meetings/meeting-presence-location.ts",
      "lib/dashboard/command-center.ts",
      "components/admin/meetings/workspace/MeetingProtocolPrintView.tsx",
    ];
    for (const rel of changedPaths) {
      expect(rel.startsWith("app/")).toBe(false);
    }
  });
});
