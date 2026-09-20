import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: vi.fn() },
    trainingSession: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    participationResponse: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { loadAttendanceObligationCandidates } from "../sources/attendance-obligations";
import { PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS } from "../config";

const TENANT = "tenant-a";
const NOW = new Date("2026-09-20T12:00:00.000Z");
const PERSON_CHILD = "person-child";
const PERSON_OTHER = "person-other";
const TS_ID = "ts-active";
const TEAM_ID = "team-1";
const SEASON_ID = "season-1";

function mockMembership(personId: string) {
  return {
    personId,
    teamSeasonId: TS_ID,
    person: {
      firstName: "James",
      lastName: "Test",
      displayName: personId === PERSON_CHILD ? "James" : "Other",
    },
    teamSeason: {
      teamId: TEAM_ID,
      seasonId: SEASON_ID,
      displayName: "U15",
      team: { name: "Team U15" },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
    mockMembership(PERSON_CHILD),
  ] as never);
  vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([] as never);
});

describe("AUFGABEN-05 — batched attendance obligations", () => {
  it("D — missing response row yields OPEN actionable candidate", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "Heimspiel",
        startAt: new Date("2026-09-25T18:00:00.000Z"),
      },
    ] as never);

    const rows = await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      personId: PERSON_CHILD,
      eventKind: "MATCH",
      eventId: "match-1",
      responseStatus: "OPEN",
      responseId: null,
    });
  });

  it("E — OPEN row remains actionable", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "Heimspiel",
        startAt: new Date("2026-09-25T18:00:00.000Z"),
      },
    ] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
      {
        id: "resp-open",
        personId: PERSON_CHILD,
        teamSeasonId: TS_ID,
        eventKind: "MATCH",
        trainingSessionId: null,
        eventId: "match-1",
        status: "OPEN",
      },
    ] as never);

    const rows = await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].responseId).toBe("resp-open");
  });

  it("F/G/H — YES, NO, MAYBE are excluded", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "Heimspiel",
        startAt: new Date("2026-09-25T18:00:00.000Z"),
      },
    ] as never);

    for (const status of ["YES", "NO", "MAYBE"] as const) {
      vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
        {
          id: `resp-${status}`,
          personId: PERSON_CHILD,
          teamSeasonId: TS_ID,
          eventKind: "MATCH",
          trainingSessionId: null,
          eventId: "match-1",
          status,
        },
      ] as never);
      const rows = await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
      expect(rows).toHaveLength(0);
    }
  });

  it("K — two children on same event produce two candidates", async () => {
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
      mockMembership("child-a"),
      mockMembership("child-b"),
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "Heimspiel",
        startAt: new Date("2026-09-25T18:00:00.000Z"),
      },
    ] as never);

    const rows = await loadAttendanceObligationCandidates(
      TENANT,
      ["child-a", "child-b"],
      NOW,
    );
    expect(rows.map((r) => r.personId).sort()).toEqual(["child-a", "child-b"]);
  });

  it("O — TRAINING uses trainingSessionId", async () => {
    vi.mocked(prisma.trainingSession.findMany).mockResolvedValue([
      {
        id: "session-1",
        teamSeasonId: TS_ID,
        startAt: new Date("2026-09-22T17:00:00.000Z"),
        trainingSeries: { title: "Technik" },
      },
    ] as never);

    const rows = await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    expect(rows[0]).toMatchObject({
      eventKind: "TRAINING",
      trainingSessionId: "session-1",
    });
  });

  it("P/Q — MATCH and TOURNAMENT only from typed events", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "Match",
        startAt: new Date("2026-09-25T18:00:00.000Z"),
      },
      {
        id: "tournament-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "TOURNAMENT",
        title: "Cup",
        startAt: new Date("2026-09-26T18:00:00.000Z"),
      },
    ] as never);

    const rows = await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    expect(rows.map((r) => r.eventKind).sort()).toEqual(["MATCH", "TOURNAMENT"]);
  });

  it("R — OTHER events are not returned by query filter", async () => {
    await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: ["MATCH", "TOURNAMENT"] },
        }),
      }),
    );
  });

  it("X — horizon bound is applied to event/session queries", async () => {
    await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    const until = new Date(NOW);
    until.setDate(until.getDate() + PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS);

    expect(prisma.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { gte: NOW, lte: until },
        }),
      }),
    );
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { gte: NOW, lte: until },
        }),
      }),
    );
  });

  it("Y — batched queries (no per-obligation findMany)", async () => {
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
      mockMembership("child-a"),
      mockMembership("child-b"),
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "match-1",
        teamId: TEAM_ID,
        seasonId: SEASON_ID,
        type: "MATCH",
        title: "Heimspiel",
        startAt: new Date("2026-09-25T18:00:00.000Z"),
      },
    ] as never);

    await loadAttendanceObligationCandidates(TENANT, ["child-a", "child-b"], NOW);

    expect(prisma.playerSquadMember.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.trainingSession.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.participationResponse.findMany).toHaveBeenCalledTimes(1);
  });

  it("N — roster query is tenant-scoped", async () => {
    await loadAttendanceObligationCandidates(TENANT, [PERSON_CHILD], NOW);
    expect(prisma.playerSquadMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamSeason: expect.objectContaining({
            team: { tenantId: TENANT },
          }),
        }),
      }),
    );
  });

  it("M — unrelated authorized person without roster membership yields nothing", async () => {
    const rows = await loadAttendanceObligationCandidates(
      TENANT,
      [PERSON_OTHER],
      NOW,
    );
    expect(rows).toEqual([]);
  });
});
