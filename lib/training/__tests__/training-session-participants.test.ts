/**
 * TRAININGCENTER-UX-03R2 — training session participant roster loader
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainingSession: { findFirst: vi.fn() },
    trainerTeamMember: { findMany: vi.fn() },
    playerSquadMember: { findMany: vi.fn() },
    participationResponse: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { getTrainingSessionParticipantRoster } from "../training-session-participants";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const SESSION_ID = "session-f2";
const TS_F2 = "ts-f2";
const TS_OTHER = "ts-other";
const TEAM_F2 = "team-f2";

function mockSession(teamSeasonId: string, tenantId = TENANT_A) {
  vi.mocked(prisma.trainingSession.findFirst).mockResolvedValue({
    id: SESSION_ID,
    teamSeasonId,
    teamSeason: {
      teamId: TEAM_F2,
      team: { tenantId },
    },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession(TS_F2);
  vi.mocked(prisma.trainerTeamMember.findMany).mockResolvedValue([]);
  vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([]);
  vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([]);
});

describe("getTrainingSessionParticipantRoster — UX-03R2", () => {
  it("includes active trainers for the session team season only", async () => {
    vi.mocked(prisma.trainerTeamMember.findMany).mockResolvedValue([
      {
        roleLabel: "Head Coach",
        person: {
          id: "trainer-1",
          firstName: "Michael",
          lastName: "Duijster",
          displayName: null,
          imageUrl: null,
        },
      },
    ] as never);

    const roster = await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);

    expect(roster.participants.filter((p) => p.role === "TRAINER")).toHaveLength(1);
    expect(roster.participants[0]).toMatchObject({
      personId: "trainer-1",
      displayName: "Michael Duijster",
      role: "TRAINER",
    });

    expect(prisma.trainerTeamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamSeasonId: TS_F2,
          status: "ACTIVE",
          teamSeason: { team: { tenantId: TENANT_A } },
        }),
      }),
    );
  });

  it("includes squad players scoped to team season", async () => {
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
      {
        person: {
          id: "player-1",
          firstName: "James",
          lastName: "Example",
          displayName: null,
          imageUrl: null,
        },
      },
    ] as never);

    const roster = await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);

    expect(roster.participants.filter((p) => p.role === "PLAYER")).toHaveLength(1);
    expect(roster.participants[0].displayName).toBe("James Example");
  });

  it("does not include people from unrelated team seasons (query contract)", async () => {
    await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);

    expect(prisma.trainerTeamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamSeasonId: TS_F2 }),
      }),
    );
    expect(prisma.playerSquadMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamSeasonId: TS_F2 }),
      }),
    );
    expect(prisma.trainerTeamMember.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamSeasonId: TS_OTHER }),
      }),
    );
  });

  it("scopes people by tenant on membership queries", async () => {
    await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);

    expect(prisma.trainerTeamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ person: { tenantId: TENANT_A } }),
      }),
    );
    expect(prisma.playerSquadMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ person: { tenantId: TENANT_A } }),
      }),
    );
  });

  it("shows participation status when a canonical response row exists", async () => {
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
      {
        person: {
          id: "player-yes",
          firstName: "A",
          lastName: "One",
          displayName: null,
          imageUrl: null,
        },
      },
      {
        person: {
          id: "player-none",
          firstName: "B",
          lastName: "Two",
          displayName: null,
          imageUrl: null,
        },
      },
    ] as never);
    vi.mocked(prisma.participationResponse.findMany).mockResolvedValue([
      { personId: "player-yes", status: "YES" },
    ] as never);

    const roster = await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);
    const players = roster.participants.filter((p) => p.role === "PLAYER");

    expect(players.find((p) => p.personId === "player-yes")?.participationStatus).toBe("YES");
    expect(players.find((p) => p.personId === "player-none")?.participationStatus).toBeUndefined();
  });

  it("loads participation responses in one batched query", async () => {
    await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);

    expect(prisma.participationResponse.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.participationResponse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_A,
          teamSeasonId: TS_F2,
          trainingSessionId: SESSION_ID,
          eventKind: "TRAINING",
        }),
      }),
    );
  });

  it("rejects cross-tenant session linkage", async () => {
    mockSession(TS_F2, TENANT_B);

    await expect(getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID)).rejects.toThrow();
  });

  it("supports multiple trainers and players", async () => {
    vi.mocked(prisma.trainerTeamMember.findMany).mockResolvedValue([
      {
        roleLabel: null,
        person: { id: "t1", firstName: "T", lastName: "One", displayName: null, imageUrl: null },
      },
      {
        roleLabel: null,
        person: { id: "t2", firstName: "T", lastName: "Two", displayName: null, imageUrl: null },
      },
    ] as never);
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
      { person: { id: "p1", firstName: "P", lastName: "One", displayName: null, imageUrl: null } },
      { person: { id: "p2", firstName: "P", lastName: "Two", displayName: null, imageUrl: null } },
      { person: { id: "p3", firstName: "P", lastName: "Three", displayName: null, imageUrl: null } },
    ] as never);

    const roster = await getTrainingSessionParticipantRoster(TENANT_A, SESSION_ID);

    expect(roster.participants.filter((p) => p.role === "TRAINER")).toHaveLength(2);
    expect(roster.participants.filter((p) => p.role === "PLAYER")).toHaveLength(3);
  });
});
