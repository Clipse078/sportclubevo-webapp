/**
 * PLANNING-UX-07R4B — cross-event facility availability contract proofs.
 *
 * Proves getResourceAvailability (canonical engine) returns overlapping
 * occupancy from Training, Match, and Tournament in one aggregated pass —
 * not entity-type isolated.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  facilityResourceFindMany: vi.fn(),
  trainingSessionFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  tournamentResourceAllocationFindMany: vi.fn(),
  tournamentParticipantAllocationFindMany: vi.fn(),
  eventFacilityAllocationFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facilityResource: { findMany: mocks.facilityResourceFindMany },
    trainingSession: { findMany: mocks.trainingSessionFindMany },
    event: { findMany: mocks.eventFindMany },
    tournamentResourceAllocation: { findMany: mocks.tournamentResourceAllocationFindMany },
    tournamentParticipantAllocation: { findMany: mocks.tournamentParticipantAllocationFindMany },
    eventFacilityAllocation: { findMany: mocks.eventFacilityAllocationFindMany },
  },
}));

import { getResourceAvailability } from "../availability-service";

const TENANT = "tenant-a";
const ROOM_E1 = {
  id: "room-e1",
  name: "Garderobe E1",
  code: "E1",
  type: "DRESSING_ROOM",
  facilityId: "fac-dr",
  facility: { name: "Garderoben" },
};
const ROOM_E2 = {
  id: "room-e2",
  name: "Garderobe E2",
  code: "E2",
  type: "DRESSING_ROOM",
  facilityId: "fac-dr",
  facility: { name: "Garderoben" },
};
const ROOM_E3 = {
  id: "room-e3",
  name: "Garderobe E3",
  code: "E3",
  type: "DRESSING_ROOM",
  facilityId: "fac-dr",
  facility: { name: "Garderoben" },
};
const PITCH = {
  id: "pitch-k2",
  name: "Kunstrasen 2",
  code: "KUNSTRASEN_2",
  type: "FULL_PITCH",
  facilityId: "fac-p",
  facility: { name: "Anlage" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.trainingSessionFindMany.mockResolvedValue([]);
  mocks.eventFindMany.mockResolvedValue([]);
  mocks.tournamentResourceAllocationFindMany.mockResolvedValue([]);
  mocks.tournamentParticipantAllocationFindMany.mockResolvedValue([]);
  mocks.eventFacilityAllocationFindMany.mockResolvedValue([]);
});

describe("PLANNING-UX-07R4B — cross-event occupancy (canonical engine)", () => {
  it("MATCH window sees overlapping TRAINING on dressing room (scenario A)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ROOM_E1]);
    mocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "training-session",
        startAt: new Date("2026-09-26T07:00:00.000Z"),
        endAt: new Date("2026-09-26T08:30:00.000Z"),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Team A",
          allocations: [{ facilityResourceId: "room-e1", facilityResource: { type: "DRESSING_ROOM" } }],
        },
        sessionAllocations: [],
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T09:00:00.000Z",
      group: "DRESSING_ROOM",
    });

    expect(result[0]).toMatchObject({
      status: "OCCUPIED",
      conflictSourceType: "TRAINING",
    });
    expect(result[0].conflictLabel).toContain("Team A");
  });

  it("MATCH B sees MATCH A dressing room (scenario B)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ROOM_E2]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-a",
        title: "Heim",
        opponentName: "FC Example",
        startAt: new Date("2026-09-26T07:00:00.000Z"),
        endAt: new Date("2026-09-26T08:30:00.000Z"),
        pitchCode: null,
        homeDressingRoomCode: "E2",
        awayDressingRoomCode: null,
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T09:00:00.000Z",
      group: "DRESSING_ROOM",
    });

    expect(result[0]).toMatchObject({ status: "OCCUPIED", conflictSourceType: "MATCH" });
    expect(result[0].conflictLabel).toContain("FC Example");
  });

  it("MATCH sees TOURNAMENT participant dressing room (scenario C)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ROOM_E3]);
    mocks.tournamentParticipantAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: "room-e3",
        tournamentParticipant: {
          team: { name: "Team C" },
          externalTeam: null,
          externalClub: null,
          displayName: null,
          manualLabel: null,
          event: {
            id: "tournament-1",
            title: "PlayMore Turnier",
            startAt: new Date("2026-09-26T07:00:00.000Z"),
            endAt: new Date("2026-09-26T10:00:00.000Z"),
          },
        },
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T08:00:00.000Z",
      endAt: "2026-09-26T09:30:00.000Z",
      group: "DRESSING_ROOM",
    });

    expect(result[0]).toMatchObject({ status: "OCCUPIED", conflictSourceType: "TOURNAMENT" });
    expect(result[0].conflictLabel).toContain("Team C");
  });

  it("TRAINING window sees overlapping MATCH pitch (scenario D)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([PITCH]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        title: "Liga",
        opponentName: "Gegner",
        startAt: new Date("2026-09-26T15:00:00.000Z"),
        endAt: new Date("2026-09-26T16:30:00.000Z"),
        pitchCode: "KUNSTRASEN_2",
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T15:30:00.000Z",
      endAt: "2026-09-26T17:00:00.000Z",
      group: "PITCH_HALL",
    });

    expect(result[0]).toMatchObject({ status: "OCCUPIED", conflictSourceType: "MATCH" });
  });

  it("TRAINING sees TOURNAMENT pitch (scenario E)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([PITCH]);
    mocks.tournamentResourceAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: "pitch-k2",
        event: {
          id: "tournament-2",
          title: "Hallenturnier",
          startAt: new Date("2026-09-26T15:00:00.000Z"),
          endAt: new Date("2026-09-26T18:00:00.000Z"),
        },
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T16:00:00.000Z",
      endAt: "2026-09-26T17:30:00.000Z",
      group: "PITCH_HALL",
    });

    expect(result[0]).toMatchObject({ status: "OCCUPIED", conflictSourceType: "TOURNAMENT" });
  });

  it("TOURNAMENT window sees TRAINING dressing room (scenario F)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([
      { ...ROOM_E1, code: "E4", id: "room-e4", name: "Garderobe E4" },
    ]);
    mocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "training-f",
        startAt: new Date("2026-09-26T07:00:00.000Z"),
        endAt: new Date("2026-09-26T08:30:00.000Z"),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Junioren F2",
          allocations: [{ facilityResourceId: "room-e4", facilityResource: { type: "DRESSING_ROOM" } }],
        },
        sessionAllocations: [],
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T10:00:00.000Z",
      group: "DRESSING_ROOM",
    });

    expect(result[0]).toMatchObject({ status: "OCCUPIED", conflictSourceType: "TRAINING" });
    expect(result[0].conflictLabel).toContain("Junioren F2");
  });

  it("TOURNAMENT window sees MATCH dressing room O1 (scenario G)", async () => {
    const roomO1 = {
      id: "room-o1",
      name: "Garderobe O1",
      code: "O1",
      type: "DRESSING_ROOM",
      facilityId: "fac-dr",
      facility: { name: "Garderoben" },
    };
    mocks.facilityResourceFindMany.mockResolvedValue([roomO1]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-g",
        title: "Cup",
        opponentName: null,
        startAt: new Date("2026-09-26T08:00:00.000Z"),
        endAt: new Date("2026-09-26T09:30:00.000Z"),
        pitchCode: null,
        homeDressingRoomCode: "O1",
        awayDressingRoomCode: null,
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:00:00.000Z",
      endAt: "2026-09-26T10:00:00.000Z",
      group: "DRESSING_ROOM",
    });

    expect(result[0]).toMatchObject({ status: "OCCUPIED", conflictSourceType: "MATCH" });
  });

  it("uses bounded parallel queries (no per-resource fetch loop)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([PITCH, ROOM_E1]);

    await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T09:00:00.000Z",
      group: "PITCH_HALL",
    });

    expect(mocks.trainingSessionFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.eventFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.tournamentResourceAllocationFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.tournamentParticipantAllocationFindMany).not.toHaveBeenCalled();
  });
});

describe("PLANNING-UX-07R4B — time overlap and exclusion", () => {
  beforeEach(() => {
    mocks.facilityResourceFindMany.mockResolvedValue([PITCH]);
  });

  it("excludes non-overlapping match on a different day", async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-later",
        title: "Spät",
        opponentName: null,
        startAt: new Date("2026-09-27T15:00:00.000Z"),
        endAt: new Date("2026-09-27T16:30:00.000Z"),
        pitchCode: "KUNSTRASEN_2",
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T15:30:00.000Z",
      endAt: "2026-09-26T17:00:00.000Z",
      group: "PITCH_HALL",
    });

    expect(result[0].status).toBe("FREE");
  });

  it("touching boundary does not count as overlap", async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-touch",
        title: "Touch",
        opponentName: null,
        startAt: new Date("2026-09-26T15:00:00.000Z"),
        endAt: new Date("2026-09-26T15:30:00.000Z"),
        pitchCode: "KUNSTRASEN_2",
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T15:30:00.000Z",
      endAt: "2026-09-26T17:00:00.000Z",
      group: "PITCH_HALL",
    });

    expect(result[0].status).toBe("FREE");
  });

  it("excludeEventId removes only the current match, not another overlapping match", async () => {
    mocks.eventFindMany.mockResolvedValue([]);

    await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T09:00:00.000Z",
      group: "PITCH_HALL",
      excludeEventId: "match-self",
    });

    expect(mocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "match-self" } }) }),
    );

    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-other",
        title: "Other",
        opponentName: "Other Opp",
        startAt: new Date("2026-09-26T07:30:00.000Z"),
        endAt: new Date("2026-09-26T09:00:00.000Z"),
        pitchCode: "KUNSTRASEN_2",
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ]);

    const otherVisible = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T09:00:00.000Z",
      group: "PITCH_HALL",
      excludeEventId: "match-self",
    });
    expect(otherVisible[0].status).toBe("OCCUPIED");
    expect(otherVisible[0].conflictLabel).toContain("Other Opp");
  });

  it("excludeEventId on tournament edit still returns cross-event training occupancy", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ROOM_E1]);
    mocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "training-x",
        startAt: new Date("2026-09-26T07:00:00.000Z"),
        endAt: new Date("2026-09-26T08:30:00.000Z"),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Externes Training",
          allocations: [{ facilityResourceId: "room-e1", facilityResource: { type: "DRESSING_ROOM" } }],
        },
        sessionAllocations: [],
      },
    ]);
    mocks.tournamentParticipantAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: "room-e1",
        tournamentParticipant: {
          team: { name: "Team A" },
          externalTeam: null,
          externalClub: null,
          displayName: null,
          manualLabel: null,
          event: {
            id: "tournament-self",
            title: "Cup",
            startAt: new Date("2026-09-26T07:00:00.000Z"),
            endAt: new Date("2026-09-26T10:00:00.000Z"),
          },
        },
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T07:30:00.000Z",
      endAt: "2026-09-26T10:00:00.000Z",
      group: "DRESSING_ROOM",
      excludeEventId: "tournament-self",
    });

    expect(result[0].status).toBe("OCCUPIED");
    expect(result[0].conflictSourceType).toBe("TRAINING");
    expect(result[0].conflictLabel).toContain("Externes Training");
  });

  it("MATCH window sees overlapping VERANSTALTUNG on pitch (MATCH_SEES_VERANSTALTUNG)", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([PITCH]);
    mocks.eventFacilityAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: "pitch-k2",
        facilityResource: { type: "FULL_PITCH" },
        event: {
          id: "ver-1",
          title: "Generalversammlung",
          startAt: new Date("2026-09-26T16:00:00.000Z"),
          endAt: new Date("2026-09-26T18:00:00.000Z"),
        },
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T16:30:00.000Z",
      endAt: "2026-09-26T17:30:00.000Z",
      group: "PITCH_HALL",
    });

    expect(result[0]).toMatchObject({
      status: "OCCUPIED",
      conflictSourceType: "VERANSTALTUNG",
      conflictLabel: "Generalversammlung",
    });
  });

  it("excludeEventId hides current Veranstaltung but not other events", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ROOM_E1]);
    mocks.eventFacilityAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: "room-e1",
        facilityResource: { type: "DRESSING_ROOM" },
        event: {
          id: "ver-a",
          title: "Generalversammlung",
          startAt: new Date("2026-09-26T16:00:00.000Z"),
          endAt: new Date("2026-09-26T18:00:00.000Z"),
        },
      },
      {
        facilityResourceId: "room-e1",
        facilityResource: { type: "DRESSING_ROOM" },
        event: {
          id: "ver-b",
          title: "Sommerfest",
          startAt: new Date("2026-09-26T16:00:00.000Z"),
          endAt: new Date("2026-09-26T18:00:00.000Z"),
        },
      },
    ]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T16:30:00.000Z",
      endAt: "2026-09-26T17:30:00.000Z",
      group: "DRESSING_ROOM",
      excludeEventId: "ver-a",
    });

    expect(result[0].status).toBe("OCCUPIED");
    expect(result[0].conflictLabel).toBe("Sommerfest");
  });

  it("excludeTrainingSessionId removes only the edited training occurrence", async () => {
    mocks.trainingSessionFindMany.mockResolvedValue([]);

    const result = await getResourceAvailability({
      tenantId: TENANT,
      startAt: "2026-09-26T15:30:00.000Z",
      endAt: "2026-09-26T17:00:00.000Z",
      group: "PITCH_HALL",
      excludeTrainingSessionId: "session-self",
    });

    expect(result[0].status).toBe("FREE");
    expect(mocks.trainingSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "session-self" } }) }),
    );
  });
});
