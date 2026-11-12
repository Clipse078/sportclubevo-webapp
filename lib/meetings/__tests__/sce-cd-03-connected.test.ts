import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meetingAgendaItem: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

const ROOT = join(__dirname, "../../..");

function readSrc(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SCE-CD-03 connected club development", () => {
  it("extends TaskContextType with MEETING_DECISION and INITIATIVE", () => {
    const schema = readSrc("prisma/schema.prisma");
    expect(schema).toContain("MEETING_DECISION");
    expect(schema).toContain("INITIATIVE");
  });

  it("registers decision task API route", () => {
    expect(readSrc("app/api/meetings/[id]/decisions/[decisionId]/tasks/route.ts")).toContain(
      "createMeetingDecisionTask",
    );
  });

  it("validates agenda link for decisions", async () => {
    const { resolveMeetingDecisionAgendaLink } = await import("@/lib/meetings/meeting-decision-agenda-link");
    await expect(
      resolveMeetingDecisionAgendaLink(
        { tenantId: "t1", userId: "u1", permissionKeys: [] } as never,
        "m1",
        "a1",
      ),
    ).rejects.toThrow(/Traktandum/);
  });
});
