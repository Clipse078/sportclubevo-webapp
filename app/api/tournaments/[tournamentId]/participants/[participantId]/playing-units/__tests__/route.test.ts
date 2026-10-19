/**
 * GET/POST playing-units API — SCE-TOURNAMENT-PLANNER-02C R2 UAT regression
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getTournamentParticipant: vi.fn(),
  listTournamentParticipantUnits: vi.fn(),
  resolveEffectivePlayingUnits: vi.fn(),
  splitParticipantIntoDefaultSubunits: vi.fn(),
  createTournamentParticipantUnit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

vi.mock("@/lib/tournaments/participant-service", () => ({
  getTournamentParticipant: mocks.getTournamentParticipant,
}));

vi.mock("@/lib/tournament-scheduling/tournament-participant-unit-service", () => ({
  listTournamentParticipantUnits: mocks.listTournamentParticipantUnits,
  resolveEffectivePlayingUnits: mocks.resolveEffectivePlayingUnits,
  splitParticipantIntoDefaultSubunits: mocks.splitParticipantIntoDefaultSubunits,
  createTournamentParticipantUnit: mocks.createTournamentParticipantUnit,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { GET, POST } from "../route";

const TENANT = "tenant-a";
const TOURNAMENT_ID = "tournament-01";
const PARTICIPANT_ID = "participant-01";

function authOk() {
  return {
    ok: true as const,
    status: 200,
    error: null,
    session: { user: { id: "user-1", activeTenantId: TENANT } },
  };
}

function params() {
  return { params: Promise.resolve({ tournamentId: TOURNAMENT_ID, participantId: PARTICIPANT_ID }) };
}

const participant = {
  id: PARTICIPANT_ID,
  tournamentId: TOURNAMENT_ID,
  displayName: "FC Allschwil Junioren E1",
};

const implicitFull = {
  id: "implicit-full:participant-01",
  tournamentParticipantId: PARTICIPANT_ID,
  displayName: participant.displayName,
  mode: "FULL" as const,
  capacityPartitionKey: null,
  displayOrder: 0,
  isPersisted: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiAnyPermission.mockResolvedValue(authOk());
  mocks.getTournamentParticipant.mockResolvedValue(participant);
  mocks.listTournamentParticipantUnits.mockResolvedValue([]);
  mocks.resolveEffectivePlayingUnits.mockReturnValue([implicitFull]);
});

describe("GET playing-units", () => {
  it("returns implicit full-team compatibility when zero persisted units", async () => {
    const res = await GET(
      new NextRequest(
        `http://localhost/api/tournaments/${TOURNAMENT_ID}/participants/${PARTICIPANT_ID}/playing-units`,
      ),
      params(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persistedUnits).toEqual([]);
    expect(body.usesImplicitFullTeam).toBe(true);
    expect(body.effectiveUnits).toHaveLength(1);
    expect(body.effectiveUnits[0].mode).toBe("FULL");
  });

  it("returns actionable error when persistence layer fails (missing schema)", async () => {
    mocks.listTournamentParticipantUnits.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Table does not exist", {
        code: "P2021",
        clientVersion: "test",
      }),
    );
    const res = await GET(
      new NextRequest(
        `http://localhost/api/tournaments/${TOURNAMENT_ID}/participants/${PARTICIPANT_ID}/playing-units`,
      ),
      params(),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.errorKind).toBe("database");
    expect(body.error).toMatch(/Spielteams konnten nicht geladen/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
      session: null,
    });
    const res = await GET(
      new NextRequest(
        `http://localhost/api/tournaments/${TOURNAMENT_ID}/participants/${PARTICIPANT_ID}/playing-units`,
      ),
      params(),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST playing-units split-default", () => {
  it("invokes split mutation and returns persisted units", async () => {
    const units = [
      {
        id: "u1",
        tournamentParticipantId: PARTICIPANT_ID,
        displayName: "E1-1",
        mode: "SUBUNIT" as const,
        capacityPartitionKey: null,
        displayOrder: 0,
        isPersisted: true,
      },
      {
        id: "u2",
        tournamentParticipantId: PARTICIPANT_ID,
        displayName: "E1-2",
        mode: "SUBUNIT" as const,
        capacityPartitionKey: null,
        displayOrder: 1,
        isPersisted: true,
      },
    ];
    mocks.splitParticipantIntoDefaultSubunits.mockResolvedValue(units);

    const res = await POST(
      new NextRequest(
        `http://localhost/api/tournaments/${TOURNAMENT_ID}/participants/${PARTICIPANT_ID}/playing-units`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "split-default", baseDisplayName: "E1" }),
        },
      ),
      params(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.units).toHaveLength(2);
    expect(mocks.splitParticipantIntoDefaultSubunits).toHaveBeenCalledWith(
      TENANT,
      TOURNAMENT_ID,
      PARTICIPANT_ID,
      "E1",
    );
  });

  it("returns mutation error when split persistence fails", async () => {
    mocks.splitParticipantIntoDefaultSubunits.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Table does not exist", {
        code: "P2021",
        clientVersion: "test",
      }),
    );

    const res = await POST(
      new NextRequest(
        `http://localhost/api/tournaments/${TOURNAMENT_ID}/participants/${PARTICIPANT_ID}/playing-units`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "split-default" }),
        },
      ),
      params(),
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.errorKind).toBe("database");
    expect(body.error).toMatch(/nicht erstellt/i);
  });
});
