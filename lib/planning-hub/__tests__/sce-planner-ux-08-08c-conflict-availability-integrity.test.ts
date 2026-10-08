/**
 * SCE-PLANNER-UX-08-08C — conflict / availability / lifecycle integrity characterization.
 *
 * Proves facilityResourceId is canonical identity for FK-backed weekplanner refs;
 * lifecycle presentation changes must not erase operational conflict truth.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAssignableFacilityResource } from "@/lib/facilities/facility-resource-write-validation";
import { getResourceAvailability } from "@/lib/facilities/availability-service";
import {
  annotateWeekplannerConflicts,
  detectPairwiseWeekplannerConflicts,
} from "@/lib/weekplanner/conflict-detection";
import { removeCancelledTrainingSessionFromItems } from "@/lib/planning-hub/training-cancellation-reconciliation";
import type {
  WeekplannerMatchItem,
  WeekplannerResourceRef,
  WeekplannerTrainingItem,
  WeekplannerTournamentItem,
  WeekplannerVeranstaltungItem,
} from "@/lib/weekplanner/types";

const START = new Date("2026-10-07T18:00:00.000Z");
const END = new Date("2026-10-07T19:30:00.000Z");

function pitchRef(overrides: Partial<WeekplannerResourceRef> = {}): WeekplannerResourceRef {
  return {
    facilityResourceId: "pitch-kr2",
    facilityId: "fac-kr2",
    code: "KR2",
    name: "Kunstrasen 2",
    facilityName: "Anlage",
    resourceType: "FULL_PITCH",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
    ...overrides,
  };
}

function dressingRef(overrides: Partial<WeekplannerResourceRef> = {}): WeekplannerResourceRef {
  return {
    facilityResourceId: "room-o4",
    facilityId: "fac-dr",
    code: "O4",
    name: "O4",
    facilityName: "Garderobe",
    resourceType: "DRESSING_ROOM",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
    ...overrides,
  };
}

function training(overrides: Partial<WeekplannerTrainingItem> = {}): WeekplannerTrainingItem {
  return {
    id: "training:a",
    tenantId: "t1",
    type: "TRAINING",
    startAt: START,
    endAt: END,
    canonicalStartAt: START,
    canonicalEndAt: END,
    timeOverridden: false,
    title: "Training A",
    teamNames: ["Team A"],
    pitchAllocations: [pitchRef()],
    dressingRoomAllocations: [dressingRef()],
    canonicalPitchAllocations: [pitchRef()],
    canonicalDressingRoomAllocations: [dressingRef()],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "series-a",
    trainingSessionId: "sess-a",
    teamSeasonId: "ts-a",
    ...overrides,
  };
}

function matchItem(overrides: Partial<WeekplannerMatchItem> = {}): WeekplannerMatchItem {
  return {
    id: "match:b",
    tenantId: "t1",
    type: "MATCH",
    startAt: START,
    endAt: END,
    canonicalStartAt: START,
    canonicalEndAt: END,
    timeOverridden: false,
    title: "Match B",
    teamNames: ["Team B"],
    teamSeasonId: "ts-b",
    pitchAllocations: [pitchRef({ facilityResourceId: "pitch-kr2", code: "KR2" })],
    dressingRoomAllocations: [dressingRef()],
    canonicalPitchAllocations: [pitchRef()],
    canonicalDressingRoomAllocations: [dressingRef()],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-b",
    eventSource: "MANUAL",
    opponentName: "Opponent",
    homeAway: "HOME",
    homeSide: { displayName: "Team B", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "Opponent", logoUrl: null, isOwnTeam: false },
    awayDressingRoomAllocations: [],
    ...overrides,
  };
}

function tournamentItem(overrides: Partial<WeekplannerTournamentItem> = {}): WeekplannerTournamentItem {
  return {
    id: "tournament:c",
    tenantId: "t1",
    type: "TOURNAMENT",
    startAt: START,
    endAt: END,
    canonicalStartAt: START,
    canonicalEndAt: END,
    timeOverridden: false,
    title: "Turnier C",
    teamNames: ["Team C"],
    pitchAllocations: [pitchRef({ facilityResourceId: "pitch-kr2" })],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [pitchRef()],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-c",
    homeAway: "HOME",
    teamSeasonIds: ["ts-c"],
    participantAllocations: [
      {
        participantId: "part-1",
        label: "Team C",
        dressingRoomAllocations: [dressingRef({ facilityResourceId: "room-o4" })],
      },
    ],
    ...overrides,
  };
}

function veranstaltungItem(
  overrides: Partial<WeekplannerVeranstaltungItem> = {},
): WeekplannerVeranstaltungItem {
  return {
    id: "event:d",
    tenantId: "t1",
    type: "VERANSTALTUNG",
    startAt: START,
    endAt: END,
    canonicalStartAt: START,
    canonicalEndAt: END,
    timeOverridden: false,
    title: "Veranstaltung D",
    teamNames: [],
    pitchAllocations: [pitchRef({ facilityResourceId: "pitch-kr2" })],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [pitchRef()],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-d",
    location: null,
    teamSeasonId: null,
    allDay: false,
    ...overrides,
  };
}

function conflictPartnerIds(items: Parameters<typeof annotateWeekplannerConflicts>[0]): Set<string> {
  const annotated = annotateWeekplannerConflicts(items);
  const partners = new Set<string>();
  for (const item of annotated) {
    for (const c of item.conflicts ?? []) {
      partners.add(c.partnerItemId);
    }
  }
  return partners;
}

describe("08-08C conflict identity — facilityResourceId", () => {
  it("PITCH — archived presentation on refs does not remove pitch conflict", () => {
    const a = training();
    const b = training({
      id: "training:b",
      trainingSessionId: "sess-b",
      trainingSeriesId: "series-b",
      title: "Training B",
      pitchAllocations: [
        pitchRef({ name: "Kunstrasen 2 (archiviert)", code: "KR2" }),
      ],
    });
    const partners = conflictPartnerIds([a, b]);
    expect(partners.has("training:b")).toBe(true);
  });

  it("DRESSING_ROOM — inactive presentation on refs preserves dressing conflict", () => {
    const a = training();
    const b = training({
      id: "training:b",
      trainingSessionId: "sess-b",
      dressingRoomAllocations: [
        dressingRef({ name: "O4 (inaktiv)", facilityResourceId: "room-o4" }),
      ],
    });
    const map = detectPairwiseWeekplannerConflicts([a, b]);
    const conflicts = [...(map.get(a.id)?.values() ?? [])];
    expect(conflicts.some((c) => c.resourceKind === "DRESSING_ROOM")).toBe(true);
  });

  it("PITCH — rename updates label but preserves conflict relationships", () => {
    const before = conflictPartnerIds([training(), training({ id: "training:b", trainingSessionId: "sess-b" })]);
    const renamedPitch = pitchRef({ name: "Kunstrasen 2 — neu", code: "KR2" });
    const after = conflictPartnerIds([
      training({ pitchAllocations: [renamedPitch] }),
      training({ id: "training:b", trainingSessionId: "sess-b", pitchAllocations: [renamedPitch] }),
    ]);
    expect(after).toEqual(before);
    const annotated = annotateWeekplannerConflicts([
      training({ pitchAllocations: [renamedPitch] }),
      training({ id: "training:b", trainingSessionId: "sess-b", pitchAllocations: [renamedPitch] }),
    ]);
    const conflict = annotated[0]?.conflicts?.[0];
    expect(conflict?.facilityResourceName).toBe("Kunstrasen 2 — neu");
    expect(conflict?.facilityResourceId).toBe("pitch-kr2");
  });

  it("PITCH — distinct facilityResourceIds with identical labels still conflict only on shared id", () => {
    const otherPitch = pitchRef({
      facilityResourceId: "pitch-kr3",
      code: "KR3",
      name: "Kunstrasen 2",
    });
    const map = detectPairwiseWeekplannerConflicts([
      training({ dressingRoomAllocations: [] }),
      training({
        id: "training:b",
        trainingSessionId: "sess-b",
        pitchAllocations: [otherPitch],
        dressingRoomAllocations: [],
      }),
    ]);
    expect(map.size).toBe(0);
  });

  it("CANCELLED training removed from item set releases pitch and dressing conflicts", () => {
    const items = [training(), matchItem()];
    expect(conflictPartnerIds(items).has("match:b")).toBe(true);
    const withoutCancelled = removeCancelledTrainingSessionFromItems(items, "sess-a");
    expect(withoutCancelled.some((i) => i.id === "training:a")).toBe(false);
    expect(conflictPartnerIds(withoutCancelled).size).toBe(0);
  });
});

describe("08-08C cross-domain conflict matrix", () => {
  const pairs: Array<
    [
      string,
      () => WeekplannerTrainingItem | WeekplannerMatchItem | WeekplannerTournamentItem | WeekplannerVeranstaltungItem,
      () => WeekplannerTrainingItem | WeekplannerMatchItem | WeekplannerTournamentItem | WeekplannerVeranstaltungItem,
    ]
  > = [
    ["TRAINING_TRAINING", () => training(), () => training({ id: "training:b", trainingSessionId: "sess-b" })],
    ["TRAINING_MATCH", () => training(), () => matchItem()],
    ["TRAINING_TOURNAMENT", () => training(), () => tournamentItem()],
    ["TRAINING_EVENT", () => training(), () => veranstaltungItem()],
    ["MATCH_TOURNAMENT", () => matchItem(), () => tournamentItem()],
  ];

  it.each(pairs)("%s pitch overlap conflicts", (_label, aFactory, bFactory) => {
    const partners = conflictPartnerIds([aFactory(), bFactory()]);
    expect(partners.size).toBeGreaterThan(0);
  });

  it("TOURNAMENT_EVENT pitch overlap conflicts", () => {
    expect(conflictPartnerIds([tournamentItem(), veranstaltungItem()]).size).toBeGreaterThan(0);
  });

  it("DRESSING_CROSS_DOMAIN — training vs tournament participant same room", () => {
    const map = detectPairwiseWeekplannerConflicts([training(), tournamentItem()]);
    const dressing = [...(map.get("training:a")?.values() ?? [])].filter((c) => c.resourceKind === "DRESSING_ROOM");
    expect(dressing.length).toBeGreaterThan(0);
  });

  it("MATCH dressing away room participates in conflict detection", () => {
    const m = matchItem({
      awayDressingRoomAllocations: [dressingRef({ facilityResourceId: "room-o4" })],
    });
    const map = detectPairwiseWeekplannerConflicts([training(), m]);
    expect([...(map.get("training:a")?.values() ?? [])].some((c) => c.resourceKind === "DRESSING_ROOM")).toBe(true);
  });
});

describe("08-08C assignability vs conflict occupancy", () => {
  it("INACTIVE and ARCHIVED resources are not assignable for new writes", () => {
    expect(
      validateAssignableFacilityResource({
        id: "r1",
        tenantId: "t1",
        status: "INACTIVE",
        type: "FULL_PITCH",
        facility: { id: "f1", status: "ACTIVE" },
      }),
    ).toBe("INACTIVE_RESOURCE");
    expect(
      validateAssignableFacilityResource({
        id: "r1",
        tenantId: "t1",
        status: "ARCHIVED",
        type: "DRESSING_ROOM",
        facility: { id: "f1", status: "ACTIVE" },
      }),
    ).toBe("ARCHIVED_RESOURCE");
  });

  it("ACTIVE resource passes assignability gate", () => {
    expect(
      validateAssignableFacilityResource({
        id: "r1",
        tenantId: "t1",
        status: "ACTIVE",
        type: "FULL_PITCH",
        facility: { id: "f1", status: "ACTIVE" },
      }),
    ).toBeNull();
  });
});

// ── Availability service (mocked prisma) ────────────────────────────────────

const availabilityMocks = vi.hoisted(() => ({
  facilityResourceFindMany: vi.fn(),
  facilityResourceCodeAliasFindMany: vi.fn(),
  trainingSessionFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  tournamentResourceAllocationFindMany: vi.fn(),
  tournamentParticipantAllocationFindMany: vi.fn(),
  eventFacilityAllocationFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facilityResource: { findMany: availabilityMocks.facilityResourceFindMany },
    facilityResourceCodeAlias: { findMany: availabilityMocks.facilityResourceCodeAliasFindMany },
    trainingSession: { findMany: availabilityMocks.trainingSessionFindMany },
    event: { findMany: availabilityMocks.eventFindMany },
    tournamentResourceAllocation: { findMany: availabilityMocks.tournamentResourceAllocationFindMany },
    tournamentParticipantAllocation: { findMany: availabilityMocks.tournamentParticipantAllocationFindMany },
    eventFacilityAllocation: { findMany: availabilityMocks.eventFacilityAllocationFindMany },
  },
}));

const AV_START = "2026-10-07T18:00:00.000Z";
const AV_END = "2026-10-07T19:30:00.000Z";
const ACTIVE_PITCH = {
  id: "pitch-kr2",
  name: "Kunstrasen 2",
  code: "KR2",
  type: "FULL_PITCH",
  facilityId: "fac-kr2",
  facility: { name: "Anlage" },
};
const ACTIVE_ROOM = {
  id: "room-o4",
  name: "O4",
  code: "O4",
  type: "DRESSING_ROOM",
  facilityId: "fac-dr",
  facility: { name: "Garderobe" },
};

beforeEach(() => {
  vi.clearAllMocks();
  availabilityMocks.trainingSessionFindMany.mockResolvedValue([]);
  availabilityMocks.eventFindMany.mockResolvedValue([]);
  availabilityMocks.tournamentResourceAllocationFindMany.mockResolvedValue([]);
  availabilityMocks.tournamentParticipantAllocationFindMany.mockResolvedValue([]);
  availabilityMocks.eventFacilityAllocationFindMany.mockResolvedValue([]);
  availabilityMocks.facilityResourceCodeAliasFindMany.mockResolvedValue([]);
});

describe("08-08C availability invariants", () => {
  it("ACTIVE + FREE → assignable row FREE", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_PITCH]);
    const rows = await getResourceAvailability({
      tenantId: "t1",
      startAt: AV_START,
      endAt: AV_END,
      group: "PITCH_HALL",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("FREE");
  });

  it("ACTIVE + OCCUPIED → assignable but unavailable for interval", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_PITCH]);
    availabilityMocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "sess-a",
        startAt: new Date(AV_START),
        endAt: new Date(AV_END),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Training A",
          allocations: [{ facilityResourceId: "pitch-kr2", facilityResource: { type: "FULL_PITCH" } }],
        },
        sessionAllocations: [],
      },
    ]);
    const rows = await getResourceAvailability({
      tenantId: "t1",
      startAt: AV_START,
      endAt: AV_END,
      group: "PITCH_HALL",
    });
    expect(rows[0]?.status).toBe("OCCUPIED");
  });

  it("MATCH LEGACY — stale pitchCode stays occupied when alias maps retired code", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([
      { ...ACTIVE_PITCH, code: "KUNSTRASEN2" },
    ]);
    availabilityMocks.facilityResourceCodeAliasFindMany.mockResolvedValue([
      { code: "KR2", facilityResourceId: "pitch-kr2" },
    ]);
    availabilityMocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        title: "Spiel",
        opponentName: "Gegner",
        startAt: new Date(AV_START),
        endAt: new Date(AV_END),
        pitchCode: "KR2",
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ]);
    const rows = await getResourceAvailability({
      tenantId: "t1",
      startAt: AV_START,
      endAt: AV_END,
      group: "PITCH_HALL",
    });
    expect(rows[0]?.status).toBe("OCCUPIED");
  });

  it("DRESSING_ROOM parity — occupied active room unavailable", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_ROOM]);
    availabilityMocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "sess-a",
        startAt: new Date(AV_START),
        endAt: new Date(AV_END),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Training A",
          allocations: [{ facilityResourceId: "room-o4", facilityResource: { type: "DRESSING_ROOM" } }],
        },
        sessionAllocations: [],
      },
    ]);
    const rows = await getResourceAvailability({
      tenantId: "t1",
      startAt: AV_START,
      endAt: AV_END,
      group: "DRESSING_ROOM",
    });
    expect(rows[0]?.status).toBe("OCCUPIED");
  });
});

describe("08-08C conflict vs availability consistency (pitch)", () => {
  it("training overlap → conflict engine and availability both occupied", async () => {
    const a = training();
    const b = training({ id: "training:b", trainingSessionId: "sess-b", title: "Training B" });
    expect(conflictPartnerIds([a, b]).has("training:b")).toBe(true);

    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_PITCH]);
    availabilityMocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "sess-a",
        startAt: new Date(AV_START),
        endAt: new Date(AV_END),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Training A",
          allocations: [{ facilityResourceId: "pitch-kr2", facilityResource: { type: "FULL_PITCH" } }],
        },
        sessionAllocations: [],
      },
      {
        id: "sess-b",
        startAt: new Date(AV_START),
        endAt: new Date(AV_END),
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Training B",
          allocations: [{ facilityResourceId: "pitch-kr2", facilityResource: { type: "FULL_PITCH" } }],
        },
        sessionAllocations: [],
      },
    ]);
    const rows = await getResourceAvailability({
      tenantId: "t1",
      startAt: AV_START,
      endAt: AV_END,
      group: "PITCH_HALL",
    });
    expect(rows[0]?.status).toBe("OCCUPIED");
  });
});
