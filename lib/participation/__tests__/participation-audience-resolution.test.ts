import { beforeEach, describe, expect, it, vi } from "vitest";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";

const mocks = vi.hoisted(() => ({
  playerSquadMember: { findMany: vi.fn() },
  participationResponse: { findMany: vi.fn() },
  resolveClubEventInviteePersonIds: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: mocks.playerSquadMember,
    participationResponse: mocks.participationResponse,
  },
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  resolveClubEventInviteePersonIds: (...args: unknown[]) =>
    mocks.resolveClubEventInviteePersonIds(...args),
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

describe("participation-audience-resolution — NOT_RESPONDED / OPEN semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.playerSquadMember.findMany.mockResolvedValue([
      { personId: "p-no-row" },
      { personId: "p-open" },
      { personId: "p-yes" },
      { personId: "p-no" },
      { personId: "p-maybe" },
    ]);
  });

  it("treats missing row and explicit OPEN as outstanding (NOT_RESPONDED)", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p-open", status: "OPEN" },
      { personId: "p-yes", status: "YES" },
      { personId: "p-no", status: "NO" },
      { personId: "p-maybe", status: "MAYBE" },
    ]);

    const outstanding = await listParticipationSubjectPersonIds({
      anchor: anchor(),
      preset: "NOT_RESPONDED",
    });
    expect(outstanding).toEqual(["p-no-row", "p-open"]);
  });

  it("excludes YES, NO, MAYBE from NOT_RESPONDED", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p-yes", status: "YES" },
      { personId: "p-no", status: "NO" },
      { personId: "p-maybe", status: "MAYBE" },
    ]);
    mocks.playerSquadMember.findMany.mockResolvedValue([
      { personId: "p-yes" },
      { personId: "p-no" },
      { personId: "p-maybe" },
    ]);

    expect(
      await listParticipationSubjectPersonIds({ anchor: anchor(), preset: "NOT_RESPONDED" }),
    ).toEqual([]);
  });
});
