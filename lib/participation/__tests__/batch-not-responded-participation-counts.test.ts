import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import {
  buildResolvedEventParticipationAnchorFromKnown,
  countNotRespondedParticipantsByContextEventId,
} from "../batch-not-responded-participation-counts";

const prismaMocks = vi.hoisted(() => ({
  playerSquadMemberFindMany: vi.fn(),
  participationResponseFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: prismaMocks.playerSquadMemberFindMany },
    participationResponse: { findMany: prismaMocks.participationResponseFindMany },
  },
}));

const listParticipationMocks = vi.hoisted(() => ({
  listParticipationSubjectPersonIds: vi.fn(),
}));

vi.mock("@/lib/participation/participation-audience-resolution", () => ({
  listParticipationSubjectPersonIds: listParticipationMocks.listParticipationSubjectPersonIds,
}));

function teamAnchor(eventId: string, teamSeasonId: string): ResolvedEventParticipationAnchor {
  return buildResolvedEventParticipationAnchorFromKnown({
    tenantId: "tenant-1",
    teamId: "team-1",
    teamSeasonId,
    title: "Match",
    startAt: new Date("2026-10-02T18:00:00Z"),
    participationEvent: { eventKind: "MATCH", eventId },
  });
}

describe("SCE-HOTFIX-LOGIN-01 batch NOT_RESPONDED counts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listParticipationMocks.listParticipationSubjectPersonIds.mockResolvedValue([]);
  });

  it("uses one squad query and one participation query per team season (not per event)", async () => {
    prismaMocks.playerSquadMemberFindMany.mockResolvedValue([
      { personId: "p1" },
      { personId: "p2" },
      { personId: "p3" },
    ]);
    prismaMocks.participationResponseFindMany.mockResolvedValue([
      {
        personId: "p1",
        status: "YES",
        eventKind: "MATCH",
        eventId: "event-a",
        trainingSessionId: null,
      },
      {
        personId: "p2",
        status: "OPEN",
        eventKind: "MATCH",
        eventId: "event-a",
        trainingSessionId: null,
      },
    ]);

    const anchors = [teamAnchor("event-a", "ts-1"), teamAnchor("event-b", "ts-1")];
    const counts = await countNotRespondedParticipantsByContextEventId(anchors);

    expect(prismaMocks.playerSquadMemberFindMany).toHaveBeenCalledTimes(1);
    expect(prismaMocks.participationResponseFindMany).toHaveBeenCalledTimes(1);
    expect(counts.get("event-a")).toBe(2);
    expect(counts.get("event-b")).toBe(3);
  });
});
