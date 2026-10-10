import { beforeEach, describe, expect, it, vi } from "vitest";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";

const mocks = vi.hoisted(() => ({
  playerSquadMember: { findMany: vi.fn() },
  participationResponse: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: mocks.playerSquadMember,
    participationResponse: mocks.participationResponse,
  },
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  resolveClubEventInviteePersonIds: vi.fn(),
}));

function anchor(): ResolvedEventParticipationAnchor {
  return {
    tenantId: "tenant-a",
    teamId: "team-1",
    teamSeasonId: "ts-1",
    title: "Match",
    startAt: new Date(),
    participationEvent: { eventKind: "MATCH", eventId: "ev-1" },
    contextEventId: "ev-1",
    anchorRef: {
      eventKind: "MATCH",
      eventId: "ev-1",
      teamSeasonId: "ts-1",
      contextEventId: "ev-1",
    },
  };
}

describe("participation audience — ACTIVE structural roster filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.participationResponse.findMany.mockResolvedValue([]);
  });

  it("includes ACTIVE PlayerSquadMember in eligible population query", async () => {
    mocks.playerSquadMember.findMany.mockResolvedValue([{ personId: "p-active" }]);
    const ids = await listParticipationSubjectPersonIds({ anchor: anchor(), preset: "ALL_INVITEES" });
    expect(ids).toEqual(["p-active"]);
    expect(mocks.playerSquadMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamSeasonId: "ts-1",
          status: "ACTIVE",
        }),
      }),
    );
  });
});
