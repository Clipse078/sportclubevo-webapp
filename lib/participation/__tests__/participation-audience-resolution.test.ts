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

function clubEventAnchor(): ResolvedEventParticipationAnchor {
  return {
    tenantId: "tenant-a",
    teamId: "",
    teamSeasonId: "",
    title: "Helferabend",
    startAt: new Date("2026-10-10T18:00:00.000Z"),
    participationEvent: { eventKind: "CLUB_EVENT", eventId: "evt-club-1" },
    contextEventId: "evt-club-1",
    anchorRef: {
      eventKind: "CLUB_EVENT",
      eventId: "evt-club-1",
      teamSeasonId: "",
      contextEventId: "evt-club-1",
    },
  };
}

describe("participation-audience-resolution — CLUB_EVENT live structural population", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p2", "p3"]);
    mocks.participationResponse.findMany.mockResolvedValue([]);
  });

  it("ALL and NOT_RESPONDED use dynamically expanded invitee person ids", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "ALL_INVITEES",
      }),
    ).toEqual(["p1", "p2", "p3"]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "NOT_RESPONDED",
      }),
    ).toEqual(["p2", "p3"]);
    expect(mocks.resolveClubEventInviteePersonIds).toHaveBeenCalledWith("tenant-a", "evt-club-1");
  });

  it("new structural member p4 enters population as NOT_RESPONDED without a response row", async () => {
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p2", "p3", "p4"]);
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p1", status: "YES" }]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "NOT_RESPONDED",
      }),
    ).toEqual(["p2", "p3", "p4"]);
  });

  it("person who leaves structural audience is excluded from ALL and preset filters", async () => {
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p3"]);
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
      { personId: "p3", status: "OPEN" },
    ]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "ALL_INVITEES",
      }),
    ).toEqual(["p1", "p3"]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "ACCEPTED_ONLY",
      }),
    ).toEqual(["p1"]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "NOT_RESPONDED",
      }),
    ).toEqual(["p3"]);
  });

  it("orphan ParticipationResponse for non-invitee does not appear in ALL or corrupt YES counts", async () => {
    mocks.resolveClubEventInviteePersonIds.mockResolvedValue(["p1", "p3"]);
    mocks.participationResponse.findMany.mockResolvedValue([{ personId: "p2", status: "YES" }]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "ALL_INVITEES",
      }),
    ).toEqual(["p1", "p3"]);
    expect(
      await listParticipationSubjectPersonIds({
        anchor: clubEventAnchor(),
        preset: "ACCEPTED_ONLY",
      }),
    ).toEqual([]);
  });
});
