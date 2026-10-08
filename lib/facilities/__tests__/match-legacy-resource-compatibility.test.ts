/**
 * SCE-PLANNER-UX-08-08C/R1 — Match legacy resource rename compatibility.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mergeLegacyMatchCodeToResourceIdMap,
  normalizeMatchLegacyResourceCode,
  propagateMatchLegacyResourceCodesForRename,
  registerFacilityResourceCodeAlias,
} from "../match-legacy-resource-compatibility";
import { getResourceAvailability } from "../availability-service";
import { updateFacilityResource } from "../queries";
import {
  annotateWeekplannerConflicts,
  detectPairwiseWeekplannerConflicts,
} from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerResourceRef, WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const mocks = vi.hoisted(() => ({
  facilityResourceFindMany: vi.fn(),
  facilityResourceFindFirst: vi.fn(),
  facilityResourceUpdateMany: vi.fn(),
  facilityResourceCodeAliasFindMany: vi.fn(),
  facilityResourceCodeAliasFindFirst: vi.fn(),
  facilityResourceCodeAliasUpsert: vi.fn(),
  eventFindMany: vi.fn(),
  eventUpdate: vi.fn(),
  trainingSessionFindMany: vi.fn(),
  tournamentResourceAllocationFindMany: vi.fn(),
  tournamentParticipantAllocationFindMany: vi.fn(),
  eventFacilityAllocationFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facilityResource: {
      findMany: (...args: unknown[]) => mocks.facilityResourceFindMany(...args),
      findFirst: (...args: unknown[]) => mocks.facilityResourceFindFirst(...args),
      updateMany: (...args: unknown[]) => mocks.facilityResourceUpdateMany(...args),
    },
    facilityResourceCodeAlias: {
      findMany: (...args: unknown[]) => mocks.facilityResourceCodeAliasFindMany(...args),
      findFirst: (...args: unknown[]) => mocks.facilityResourceCodeAliasFindFirst(...args),
      upsert: (...args: unknown[]) => mocks.facilityResourceCodeAliasUpsert(...args),
    },
    event: {
      findMany: (...args: unknown[]) => mocks.eventFindMany(...args),
      update: (...args: unknown[]) => mocks.eventUpdate(...args),
    },
    trainingSession: { findMany: (...args: unknown[]) => mocks.trainingSessionFindMany(...args) },
    tournamentResourceAllocation: {
      findMany: (...args: unknown[]) => mocks.tournamentResourceAllocationFindMany(...args),
    },
    tournamentParticipantAllocation: {
      findMany: (...args: unknown[]) => mocks.tournamentParticipantAllocationFindMany(...args),
    },
    eventFacilityAllocation: {
      findMany: (...args: unknown[]) => mocks.eventFacilityAllocationFindMany(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mocks.transaction(fn),
  },
}));

const TENANT = "tenant-a";
const RESOURCE_ID = "pitch-r1";
const AV_START = "2026-10-07T18:00:00.000Z";
const AV_END = "2026-10-07T19:30:00.000Z";

const ACTIVE_PITCH = {
  id: RESOURCE_ID,
  name: "Kunstrasen 2",
  code: "KUNSTRASEN2",
  type: "FULL_PITCH" as const,
  facilityId: "fac-1",
  facility: { name: "Anlage" },
};

function pitchRef(overrides: Partial<WeekplannerResourceRef> = {}): WeekplannerResourceRef {
  return {
    facilityResourceId: RESOURCE_ID,
    facilityId: "fac-1",
    code: "KUNSTRASEN2",
    name: "Kunstrasen 2",
    facilityName: "Anlage",
    resourceType: "FULL_PITCH",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.trainingSessionFindMany.mockResolvedValue([]);
  mocks.tournamentResourceAllocationFindMany.mockResolvedValue([]);
  mocks.tournamentParticipantAllocationFindMany.mockResolvedValue([]);
  mocks.eventFacilityAllocationFindMany.mockResolvedValue([]);
  mocks.facilityResourceCodeAliasFindFirst.mockResolvedValue(null);
  mocks.transaction.mockImplementation(async (fn) =>
    fn({
      facilityResource: {
        findFirst: mocks.facilityResourceFindFirst,
        updateMany: mocks.facilityResourceUpdateMany,
      },
      facilityResourceCodeAlias: { upsert: mocks.facilityResourceCodeAliasUpsert },
      event: { findMany: mocks.eventFindMany, update: mocks.eventUpdate },
    }),
  );
});

describe("match legacy code normalization", () => {
  it("normalizes stored codes consistently", () => {
    expect(normalizeMatchLegacyResourceCode(" kr2 ")).toBe("KR2");
  });
});

describe("alias map merge — code reuse safety", () => {
  it("current code wins over alias for the same key", () => {
    const merged = mergeLegacyMatchCodeToResourceIdMap(
      new Map([["KR2", "resource-new"]]),
      [{ code: "KR2", facilityResourceId: "resource-old" }],
    );
    expect(merged.get("KR2")).toBe("resource-new");
  });

  it("retired alias keeps historical Match on original physical resource", () => {
    const merged = mergeLegacyMatchCodeToResourceIdMap(new Map([["KUNSTRASEN2", "resource-old"]]), [
      { code: "KR2", facilityResourceId: "resource-old" },
    ]);
    expect(merged.get("KR2")).toBe("resource-old");
    expect(merged.get("KUNSTRASEN2")).toBe("resource-old");
  });
});

describe("rename propagation", () => {
  it("updates pitch and dressing codes for tenant-scoped Match events", async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        pitchCode: "KR2",
        homeDressingRoomCode: "KR2",
        awayDressingRoomCode: "O4",
      },
    ]);

    const updates = await propagateMatchLegacyResourceCodesForRename(
      { event: { findMany: mocks.eventFindMany, update: mocks.eventUpdate } },
      TENANT,
      "KR2",
      "KUNSTRASEN2",
    );

    expect(updates).toBe(1);
    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: "match-1" },
      data: {
        pitchCode: "KUNSTRASEN2",
        homeDressingRoomCode: "KUNSTRASEN2",
      },
    });
  });
});

describe("updateFacilityResource code rename seam", () => {
  it("registers alias and propagates Match codes in one transaction", async () => {
    mocks.facilityResourceFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ code: "KR2" });
    mocks.eventFindMany.mockResolvedValue([
      { id: "match-1", pitchCode: "KR2", homeDressingRoomCode: null, awayDressingRoomCode: null },
    ]);
    mocks.facilityResourceUpdateMany.mockResolvedValue({ count: 1 });

    await updateFacilityResource(RESOURCE_ID, TENANT, { code: "KUNSTRASEN2" });

    expect(mocks.facilityResourceCodeAliasUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ tenantId: TENANT, facilityResourceId: RESOURCE_ID, code: "KR2" }),
      }),
    );
    expect(mocks.eventUpdate).toHaveBeenCalled();
    expect(mocks.facilityResourceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: "KUNSTRASEN2" }) }),
    );
  });
});

describe("availability + conflict after rename", () => {
  const START = new Date(AV_START);
  const END = new Date(AV_END);

  it("PITCH — stale pitchCode resolves via alias and marks resource OCCUPIED", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_PITCH]);
    mocks.facilityResourceCodeAliasFindMany.mockResolvedValue([
      { code: "KR2", facilityResourceId: RESOURCE_ID },
    ]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        title: "Spiel",
        opponentName: "Gegner",
        startAt: START,
        endAt: END,
        pitchCode: "KR2",
        homeDressingRoomCode: null,
        awayDressingRoomCode: null,
      },
    ]);

    const rows = await getResourceAvailability({
      tenantId: TENANT,
      startAt: AV_START,
      endAt: AV_END,
      group: "PITCH_HALL",
    });

    expect(rows[0]?.status).toBe("OCCUPIED");
  });

  it("PITCH — training overlap still conflicts after resource rename", () => {
    const training: WeekplannerTrainingItem = {
      id: "training:a",
      tenantId: TENANT,
      type: "TRAINING",
      startAt: START,
      endAt: END,
      canonicalStartAt: START,
      canonicalEndAt: END,
      timeOverridden: false,
      title: "Training",
      teamNames: ["Team"],
      pitchAllocations: [pitchRef()],
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
      trainingSeriesId: "series",
      trainingSessionId: "sess",
      teamSeasonId: "ts",
    };

    const match: WeekplannerMatchItem = {
      id: "match:b",
      tenantId: TENANT,
      type: "MATCH",
      startAt: START,
      endAt: END,
      canonicalStartAt: START,
      canonicalEndAt: END,
      timeOverridden: false,
      title: "Match",
      teamNames: ["Team"],
      teamSeasonId: "ts",
      pitchAllocations: [pitchRef({ code: "KR2" })],
      dressingRoomAllocations: [],
      canonicalPitchAllocations: [pitchRef({ code: "KR2" })],
      canonicalDressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      homeAway: "HOME",
      eventId: "match-1",
      opponentName: "Gegner",
      eventSource: "SFV",
      homeSide: { displayName: "Home", logoUrl: null, isOwnTeam: true },
      awaySide: { displayName: "Away", logoUrl: null, isOwnTeam: false },
    };

    const pairwise = detectPairwiseWeekplannerConflicts([training, match]);
    const annotated = annotateWeekplannerConflicts([training, match], pairwise);
    expect(annotated[0]?.conflicts.length).toBeGreaterThan(0);
    expect(annotated[0]?.conflicts[0]?.facilityResourceId).toBe(RESOURCE_ID);
  });
});

describe("DRESSING — availability after rename", () => {
  const START = new Date(AV_START);
  const END = new Date(AV_END);
  const ACTIVE_ROOM = {
    id: "room-o4",
    name: "O4",
    code: "O4_NEW",
    type: "DRESSING_ROOM" as const,
    facilityId: "fac-dr",
    facility: { name: "Garderobe" },
  };

  it("HOME dressing stale code resolves via alias", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_ROOM]);
    mocks.facilityResourceCodeAliasFindMany.mockResolvedValue([
      { code: "O4", facilityResourceId: "room-o4" },
    ]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        title: "Spiel",
        opponentName: "Gegner",
        startAt: START,
        endAt: END,
        pitchCode: null,
        homeDressingRoomCode: "O4",
        awayDressingRoomCode: null,
      },
    ]);

    const rows = await getResourceAvailability({
      tenantId: TENANT,
      startAt: AV_START,
      endAt: AV_END,
      group: "DRESSING_ROOM",
    });
    expect(rows[0]?.status).toBe("OCCUPIED");
  });

  it("AWAY dressing stale code resolves via alias", async () => {
    mocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_ROOM]);
    mocks.facilityResourceCodeAliasFindMany.mockResolvedValue([
      { code: "E1", facilityResourceId: "room-o4" },
    ]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "match-1",
        title: "Spiel",
        opponentName: "Gegner",
        startAt: START,
        endAt: END,
        pitchCode: null,
        homeDressingRoomCode: null,
        awayDressingRoomCode: "E1",
      },
    ]);

    const rows = await getResourceAvailability({
      tenantId: TENANT,
      startAt: AV_START,
      endAt: AV_END,
      group: "DRESSING_ROOM",
    });
    expect(rows[0]?.status).toBe("OCCUPIED");
  });
});

describe("registerFacilityResourceCodeAlias", () => {
  it("is tenant-scoped via upsert key", async () => {
    await registerFacilityResourceCodeAlias(
      { facilityResourceCodeAlias: { upsert: mocks.facilityResourceCodeAliasUpsert } },
      TENANT,
      RESOURCE_ID,
      "KR2",
    );
    expect(mocks.facilityResourceCodeAliasUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_code: { tenantId: TENANT, code: "KR2" } },
      }),
    );
  });
});
