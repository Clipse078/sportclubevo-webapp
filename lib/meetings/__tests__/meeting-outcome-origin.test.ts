import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActorContext } from "@/lib/visibility/actor-context";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meetingAgendaItem: { findFirst: vi.fn() },
    meetingDecision: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { resolveMeetingActionOrigin } from "@/lib/meetings/meeting-outcome-origin";
import { buildDecisionOutcomeOrigin } from "@/lib/meetings/meeting-outcome-origin-client";

const actor = {
  tenantId: "t1",
  userId: "u1",
  permissionKeys: new Set<string>(),
} as unknown as ActorContext;

const meeting = {
  id: "m1",
  slug: "november-2026",
  title: "Vereinsleitungssitzung November 2026",
  visibilityScope: "TENANT",
  createdByUserId: "u1",
  visibleRoleRefs: null,
  visibleUserRefs: null,
  visibleTeamRefs: null,
  visibleOrgUnitRefs: null,
  visiblePersonRefs: null,
  visibleTargetGroupRefs: null,
};

describe("meeting outcome origin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canSeeMeeting).mockReturnValue(true);
  });

  it("builds decision origin chain with meeting, Traktandum and Beschluss", () => {
    const origin = buildDecisionOutcomeOrigin({
      meetingSlug: meeting.slug,
      meetingTitle: meeting.title,
      agendaItems: [{ id: "a1", orderIndex: 0, title: "Finanzen" }],
      sourceAgendaItemId: "a1",
      decisionTitle: "Budget genehmigt",
    });
    expect(origin?.links.map((l) => l.label)).toEqual([
      meeting.title,
      "Traktandum 1: Finanzen",
      "Budget genehmigt",
    ]);
    expect(origin?.links[1]?.href).toContain("traktandum=a1");
  });

  it("hides restricted meeting metadata when actor cannot see the meeting", async () => {
    vi.mocked(canSeeMeeting).mockReturnValue(false);
    const origin = await resolveMeetingActionOrigin(actor, meeting, { agendaItemId: "a1" }, []);
    expect(origin?.links).toHaveLength(1);
    expect(origin?.links[0]?.label).toBe("Sitzung");
    expect(origin?.links[0]?.restricted).toBe(true);
    expect(origin?.links[0]?.href).toBeNull();
  });

  it("includes Traktandum and optional Beschluss for visible meetings", async () => {
    vi.mocked(prisma.meetingAgendaItem.findFirst).mockResolvedValue({
      id: "a1",
      title: "Personal",
      orderIndex: 1,
    });
    vi.mocked(prisma.meetingDecision.findFirst).mockResolvedValue({
      id: "d1",
      title: "Neue Stelle",
    });

    const origin = await resolveMeetingActionOrigin(
      actor,
      meeting,
      { agendaItemId: "a1", decisionId: "d1" },
      [{ id: "a1", orderIndex: 1 }],
    );

    expect(origin?.links.map((l) => l.label)).toEqual([
      meeting.title,
      "Traktandum 1: Personal",
      "Neue Stelle",
    ]);
    expect(origin?.links[0]?.href).toContain(meeting.slug);
    expect(origin?.links[1]?.href).toContain("traktandum=a1");
  });
});