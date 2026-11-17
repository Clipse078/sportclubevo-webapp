import { TaskContextType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTraktandumTaskOccurrenceKey } from "@/lib/meetings/meeting-traktandum-task-link";

const prismaMock = vi.hoisted(() => ({
  meeting: { findFirst: vi.fn() },
  meetingAgendaItem: { findFirst: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/meetings/queries", () => ({ canSeeMeeting: () => true }));
vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

import { resolveTaskProvenance } from "@/lib/tasks/task-provenance";

describe("resolveTaskProvenance MEETING + traktandum bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.meeting.findFirst.mockResolvedValue({
      id: "m1",
      slug: "november-2026",
      title: "Vereinsleitungssitzung",
      meetingDate: new Date(),
      visibilityScope: "TENANT",
      createdByUserId: "u1",
      visibleRoleRefs: [],
      visibleUserRefs: [],
      visibleTeamRefs: [],
      visibleOrgUnitRefs: [],
      visiblePersonRefs: [],
      visibleTargetGroupRefs: [],
    });
    prismaMock.meetingAgendaItem.findFirst.mockResolvedValue({
      id: "a1",
      title: "Budget",
      orderIndex: 0,
    });
  });

  it("builds Entstanden in links for Sitzung and Traktandum from rehomed bridge key", async () => {
    const key = buildTraktandumTaskOccurrenceKey("a1", "client-req-1");
    const provenance = await resolveTaskProvenance(
      {
        tenantId: "t1",
        userId: "u1",
        permissionKeys: [],
      },
      TaskContextType.MEETING,
      "m1",
      { seriesOccurrenceKey: key },
    );
    expect(provenance?.links.map((l) => l.kind)).toEqual(["meeting", "agenda"]);
    expect(provenance?.links[1]?.href).toContain("november-2026");
    expect(provenance?.links[1]?.href).toContain("traktandum=a1");
  });
});