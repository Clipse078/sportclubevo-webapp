import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R5 carry-forward contracts", () => {
  it("exposes carry-forward API route", () => {
    expect(readSrc("app/api/meetings/[id]/carry-forward/route.ts")).toContain("listCarryForwardEligibleItems");
    expect(readSrc("app/api/meetings/[id]/carry-forward/route.ts")).toContain("applyCarryForwardSelections");
  });

  it("wires inline carry-forward UI in agenda workspace", () => {
    expect(readSrc("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx")).toContain(
      "MeetingCarryForwardPanel",
    );
    expect(readSrc("components/admin/meetings/workspace/MeetingCarryForwardPanel.tsx")).toContain(
      "Offene Themen aus früheren Sitzungen",
    );
  });

  it("stores agenda source link on schema", () => {
    expect(readSrc("prisma/schema.prisma")).toContain("sourceAgendaItemId");
  });

  it("prevents duplicate agenda carry via source id", () => {
    expect(readSrc("lib/meetings/meeting-carry-forward.ts")).toContain("sourceAgendaItemId");
    expect(readSrc("lib/meetings/meeting-carry-forward.ts")).toContain("alreadyAgendaSources");
  });
});
