/**
 * SCE-PLANNER-UX-08-08D — cross-domain integration regression (Training · Match · Tournament · Event).
 *
 * One canonical week fixture exercises facility lifecycle seams, conflict/availability,
 * Match R1 compatibility, delete-guard completeness, tenant isolation, and planner view parity.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { weekplannerCanonicalActivityKey } from "@/lib/weekplanner/canonical-activity-key";
import {
  annotateWeekplannerConflicts,
  detectPairwiseWeekplannerConflicts,
} from "@/lib/weekplanner/conflict-detection";
import { buildWeekplannerWeek } from "@/lib/weekplanner/view-model";
import { removeCancelledTrainingSessionFromItems } from "@/lib/planning-hub/training-cancellation-reconciliation";
import {
  garderobeVisibleItemIds,
  listeVisibleItemIds,
  plannerViewIdentitySnapshot,
  spielfeldVisibleItemIds,
  weekplannerItemIds,
} from "@/lib/planning-hub/planner-view-consistency";
import { validateAssignableFacilityResource } from "@/lib/facilities/facility-resource-write-validation";
import {
  assertFacilityResourceCodeAvailable,
  countFacilityResourceReferences,
  type FacilityResourceReferenceCounts,
  totalFacilityResourceReferences,
} from "@/lib/facilities/facility-resource-reference-guard";
import {
  lookupMatchLegacyResourceId,
  mergeLegacyMatchCodeToResourceIdMap,
} from "@/lib/facilities/match-legacy-resource-compatibility";
import { getResourceAvailability } from "@/lib/facilities/availability-service";
import {
  assertManipulationTenantScope,
  canMutateResourceReservationForItem,
  ManipulationForbiddenError,
} from "@/lib/planning-hub/manipulation-server-authorization";
import { summarizeAggregateCluster } from "@/lib/planning-hub/scheduler/aggregate-cluster";
import type {
  WeekplannerMatchItem,
  WeekplannerResourceRef,
  WeekplannerTrainingItem,
  WeekplannerTournamentItem,
  WeekplannerVeranstaltungItem,
  WeekplannerItem,
} from "@/lib/weekplanner/types";

const TENANT = "tenant-fca";
const TENANT_OTHER = "tenant-other";
const FAC_PARENT = "fac-hauptfeld";
const PITCH_MAIN = "res-hauptfeld-full";
const PITCH_HALF = "res-hauptfeld-a";
const PITCH_SECOND = "res-kr2";
const ROOM_D1 = "res-d1";
const ROOM_D2 = "res-d2";

const DAY_KEY = "2026-10-07";
const T_OVERLAP_START = new Date("2026-10-07T18:00:00.000Z");
const T_OVERLAP_END = new Date("2026-10-07T19:30:00.000Z");
const T_LATER_START = new Date("2026-10-07T20:00:00.000Z");
const T_LATER_END = new Date("2026-10-07T21:00:00.000Z");

const DEFAULT_HUB = {
  activity: "alle" as const,
  team: null,
  facility: null,
  conflictsOnly: false,
};

function pitchRef(
  resourceId: string,
  overrides: Partial<WeekplannerResourceRef> = {},
): WeekplannerResourceRef {
  const code =
    resourceId === PITCH_MAIN
      ? "HAUPTFELD"
      : resourceId === PITCH_HALF
        ? "HAUPTFELD A"
        : resourceId === PITCH_SECOND
          ? "KR2"
          : "PITCH";
  return {
    facilityResourceId: resourceId,
    facilityId: FAC_PARENT,
    code,
    name: overrides.name ?? code,
    facilityName: "Hauptfeld",
    resourceType: resourceId === PITCH_HALF ? "HALF_PITCH" : "FULL_PITCH",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
    ...overrides,
  };
}

function dressingRef(
  resourceId: string,
  overrides: Partial<WeekplannerResourceRef> = {},
): WeekplannerResourceRef {
  const code = resourceId === ROOM_D1 ? "D1" : "D2";
  return {
    facilityResourceId: resourceId,
    facilityId: "fac-garderobe",
    code,
    name: code,
    facilityName: "Garderobe",
    resourceType: "DRESSING_ROOM",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
    ...overrides,
  };
}

function baseItemFields(start = T_OVERLAP_START, end = T_OVERLAP_END) {
  return {
    tenantId: TENANT,
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [] as WeekplannerItem["conflicts"],
    dressingRoomOccupancyMode: "DEFAULT" as const,
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

function training(overrides: Partial<WeekplannerTrainingItem> = {}): WeekplannerTrainingItem {
  return {
    id: "training:main",
    type: "TRAINING",
    title: "Training Serie",
    teamNames: ["F1"],
    pitchAllocations: [pitchRef(PITCH_MAIN)],
    dressingRoomAllocations: [dressingRef(ROOM_D1)],
    canonicalPitchAllocations: [pitchRef(PITCH_MAIN)],
    canonicalDressingRoomAllocations: [dressingRef(ROOM_D1)],
    trainingSeriesId: "series-main",
    trainingSessionId: "sess-main",
    teamSeasonId: "ts-f1",
    ...baseItemFields(),
    ...overrides,
  };
}

function matchItem(overrides: Partial<WeekplannerMatchItem> = {}): WeekplannerMatchItem {
  return {
    id: "match:home",
    type: "MATCH",
    title: "Heimspiel",
    teamNames: ["F1"],
    teamSeasonId: "ts-f1",
    pitchAllocations: [pitchRef(PITCH_MAIN, { code: "HAUPTFELD" })],
    dressingRoomAllocations: [dressingRef(ROOM_D1)],
    canonicalPitchAllocations: [pitchRef(PITCH_MAIN)],
    canonicalDressingRoomAllocations: [dressingRef(ROOM_D1)],
    awayDressingRoomAllocations: [dressingRef(ROOM_D2)],
    eventId: "ev-match",
    eventSource: "MANUAL",
    opponentName: "Gegner",
    homeAway: "HOME",
    homeSide: { displayName: "F1", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "Gegner", logoUrl: null, isOwnTeam: false },
    ...baseItemFields(),
    ...overrides,
  };
}

function tournamentItem(overrides: Partial<WeekplannerTournamentItem> = {}): WeekplannerTournamentItem {
  return {
    id: "tournament:day",
    type: "TOURNAMENT",
    title: "Turnier",
    teamNames: ["F1", "F2"],
    pitchAllocations: [pitchRef(PITCH_MAIN)],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [pitchRef(PITCH_MAIN)],
    canonicalDressingRoomAllocations: [],
    eventId: "ev-tournament",
    homeAway: "HOME",
    teamSeasonIds: ["ts-f1", "ts-f2"],
    participantAllocations: [
      {
        participantId: "part-f1",
        label: "F1",
        dressingRoomAllocations: [dressingRef(ROOM_D1)],
      },
      {
        participantId: "part-f2",
        label: "F2",
        dressingRoomAllocations: [dressingRef(ROOM_D2)],
      },
    ],
    ...baseItemFields(),
    ...overrides,
  };
}

function veranstaltungItem(
  overrides: Partial<WeekplannerVeranstaltungItem> = {},
): WeekplannerVeranstaltungItem {
  return {
    id: "event:club",
    type: "VERANSTALTUNG",
    title: "Club Event",
    teamNames: [],
    pitchAllocations: [pitchRef(PITCH_SECOND)],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [pitchRef(PITCH_SECOND)],
    canonicalDressingRoomAllocations: [],
    eventId: "ev-other",
    location: "Clubhaus",
    teamSeasonId: null,
    allDay: false,
    ...baseItemFields(T_LATER_START, T_LATER_END),
    ...overrides,
  };
}

function buildCanonicalWeek(items: WeekplannerItem[]) {
  return buildWeekplannerWeek({
    items,
    days: [DAY_KEY],
    weekNumberLabel: "KW 41",
    rangeLabel: "6.–12. Okt.",
    param: "2026-W41",
    previousParam: "2026-W40",
    nextParam: "2026-W42",
  });
}

function canonicalIntegrationFixture(): WeekplannerItem[] {
  return [
    training(),
    matchItem(),
    tournamentItem(),
    veranstaltungItem(),
    training({
      id: "training:cancelled",
      trainingSessionId: "sess-cancel",
      trainingSeriesId: "series-cancel",
      title: "Training abgesagt",
      startAt: T_LATER_START,
      endAt: T_LATER_END,
      canonicalStartAt: T_LATER_START,
      canonicalEndAt: T_LATER_END,
      pitchAllocations: [pitchRef(PITCH_SECOND)],
      canonicalPitchAllocations: [pitchRef(PITCH_SECOND)],
      dressingRoomAllocations: [],
      canonicalDressingRoomAllocations: [],
    }),
  ];
}

function activeWeekAfterCancellation() {
  const active = removeCancelledTrainingSessionFromItems(canonicalIntegrationFixture(), "sess-cancel");
  return buildCanonicalWeek(active);
}

function conflictPartnerIds(items: WeekplannerItem[]): Set<string> {
  const annotated = annotateWeekplannerConflicts(items);
  const partners = new Set<string>();
  for (const item of annotated) {
    for (const c of item.conflicts ?? []) partners.add(c.partnerItemId);
  }
  return partners;
}

describe("08-08D cross-domain read model", () => {
  it("TRAINING · MATCH · TOURNAMENT · VERANSTALTUNG coexist with distinct canonical keys", () => {
    const week = activeWeekAfterCancellation();
    const ids = weekplannerItemIds(week);
    expect(ids.has("training:main")).toBe(true);
    expect(ids.has("match:home")).toBe(true);
    expect(ids.has("tournament:day")).toBe(true);
    expect(ids.has("event:club")).toBe(true);
    expect(ids.has("training:cancelled")).toBe(false);

    const keys = new Set(
      week.days[0]!.items.map((item) => weekplannerCanonicalActivityKey(item)),
    );
    expect(keys.size).toBe(4);
    expect(keys.has("TRAINING:sess-main")).toBe(true);
    expect(keys.has("MATCH:ev-match")).toBe(true);
    expect(keys.has("TOURNAMENT:ev-tournament")).toBe(true);
    expect(keys.has("VERANSTALTUNG:ev-other")).toBe(true);
  });

  it("each activity type retains domain-specific identity fields", () => {
    const week = activeWeekAfterCancellation();
    const byId = new Map(week.days[0]!.items.map((i) => [i.id, i]));

    const tr = byId.get("training:main")!;
    expect(tr.type).toBe("TRAINING");
    if (tr.type === "TRAINING") expect(tr.teamSeasonId).toBe("ts-f1");

    const m = byId.get("match:home")!;
    expect(m.type).toBe("MATCH");
    if (m.type === "MATCH") {
      expect(m.eventSource).toBe("MANUAL");
      expect(m.teamSeasonId).toBe("ts-f1");
    }

    const t = byId.get("tournament:day")!;
    expect(t.type).toBe("TOURNAMENT");
    if (t.type === "TOURNAMENT") {
      expect(t.teamSeasonIds).toEqual(["ts-f1", "ts-f2"]);
      expect(t.dressingRoomAllocations).toHaveLength(0);
      expect(t.participantAllocations[0]?.dressingRoomAllocations[0]?.facilityResourceId).toBe(
        ROOM_D1,
      );
    }

    const e = byId.get("event:club")!;
    expect(e.type).toBe("VERANSTALTUNG");
    if (e.type === "VERANSTALTUNG") expect(e.allDay).toBe(false);
  });
});

describe("08-08D planner view consistency", () => {
  it("Kalender · Spielfeld · Garderobe · Liste agree on activity identity", () => {
    const week = activeWeekAfterCancellation();
    const kalenderIds = weekplannerItemIds(week);
    const listeIds = listeVisibleItemIds(week, { ...DEFAULT_HUB, search: "" });
    expect(listeIds).toEqual(kalenderIds);

    const spielfeldMain = spielfeldVisibleItemIds(week, PITCH_MAIN, DEFAULT_HUB);
    expect(spielfeldMain.has("training:main")).toBe(true);
    expect(spielfeldMain.has("match:home")).toBe(true);
    expect(spielfeldMain.has("tournament:day")).toBe(true);
    expect(spielfeldMain.has("event:club")).toBe(false);

    const spielfeldKr2 = spielfeldVisibleItemIds(week, PITCH_SECOND, DEFAULT_HUB);
    expect(spielfeldKr2).toEqual(new Set(["event:club"]));

    const garderobeD1 = garderobeVisibleItemIds(week, ROOM_D1, DEFAULT_HUB);
    expect(garderobeD1.has("training:main")).toBe(true);
    expect(garderobeD1.has("match:home")).toBe(true);
    expect(garderobeD1.has("tournament:day")).toBe(true);

    for (const id of kalenderIds) {
      const item = week.days[0]!.items.find((i) => i.id === id)!;
      const snap = plannerViewIdentitySnapshot(item);
      expect(snap.id).toBe(id);
      expect(snap.conflictCount).toBe(item.conflicts.length);
    }
  });

  it("tournament participant dressing is not flattened into tournament-wide room list", () => {
    const week = activeWeekAfterCancellation();
    const tournament = week.days[0]!.items.find((i) => i.id === "tournament:day");
    expect(tournament?.type).toBe("TOURNAMENT");
    if (tournament?.type !== "TOURNAMENT") return;

    expect(tournament.dressingRoomAllocations).toHaveLength(0);
    const d1Lane = garderobeVisibleItemIds(week, ROOM_D1, DEFAULT_HUB);
    const d2Lane = garderobeVisibleItemIds(week, ROOM_D2, DEFAULT_HUB);
    expect(d1Lane.has("tournament:day")).toBe(true);
    expect(d2Lane.has("tournament:day")).toBe(true);
    expect(d1Lane.has("match:home")).toBe(true);
    expect(d2Lane.has("match:home")).toBe(true);
  });
});

describe("08-08D cross-domain conflicts", () => {
  const overlapPairs: Array<[string, () => WeekplannerItem, () => WeekplannerItem]> = [
    ["TRAINING_TRAINING", () => training(), () => training({ id: "training:b", trainingSessionId: "sess-b" })],
    ["TRAINING_MATCH", () => training(), () => matchItem()],
    ["TRAINING_TOURNAMENT", () => training(), () => tournamentItem()],
    [
      "TRAINING_EVENT",
      () => training(),
      () =>
        veranstaltungItem({
          pitchAllocations: [pitchRef(PITCH_MAIN)],
          startAt: T_OVERLAP_START,
          endAt: T_OVERLAP_END,
          canonicalStartAt: T_OVERLAP_START,
          canonicalEndAt: T_OVERLAP_END,
        }),
    ],
    ["MATCH_TOURNAMENT", () => matchItem(), () => tournamentItem()],
    [
      "MATCH_EVENT",
      () => matchItem(),
      () =>
        veranstaltungItem({
          pitchAllocations: [pitchRef(PITCH_MAIN)],
          startAt: T_OVERLAP_START,
          endAt: T_OVERLAP_END,
          canonicalStartAt: T_OVERLAP_START,
          canonicalEndAt: T_OVERLAP_END,
        }),
    ],
    [
      "TOURNAMENT_EVENT",
      () => tournamentItem(),
      () =>
        veranstaltungItem({
          pitchAllocations: [pitchRef(PITCH_MAIN)],
          startAt: T_OVERLAP_START,
          endAt: T_OVERLAP_END,
          canonicalStartAt: T_OVERLAP_START,
          canonicalEndAt: T_OVERLAP_END,
        }),
    ],
  ];

  it.each(overlapPairs)("%s — pitch overlap produces conflict", (_label, a, b) => {
    expect(conflictPartnerIds([a(), b()]).size).toBeGreaterThan(0);
  });

  it("non-overlapping interval on same pitch — no conflict", () => {
    const early = training();
    const later = veranstaltungItem({
      pitchAllocations: [pitchRef(PITCH_MAIN)],
      startAt: T_LATER_START,
      endAt: T_LATER_END,
      canonicalStartAt: T_LATER_START,
      canonicalEndAt: T_LATER_END,
    });
    expect(conflictPartnerIds([early, later]).size).toBe(0);
  });

  it("different physical pitch — no conflict", () => {
    const onMain = training({
      dressingRoomAllocations: [],
      canonicalDressingRoomAllocations: [],
    });
    const onKr2 = training({
      id: "training:kr2",
      trainingSessionId: "sess-kr2",
      pitchAllocations: [pitchRef(PITCH_SECOND)],
      canonicalPitchAllocations: [pitchRef(PITCH_SECOND)],
      dressingRoomAllocations: [],
      canonicalDressingRoomAllocations: [],
    });
    expect(conflictPartnerIds([onMain, onKr2]).size).toBe(0);
  });

  it("DRESSING_ROOM — training vs tournament participant vs match away", () => {
    const map = detectPairwiseWeekplannerConflicts([training(), tournamentItem(), matchItem()]);
    const dressingConflicts = [...map.values()].flatMap((m) => [...m.values()]).filter((c) => c.resourceKind === "DRESSING_ROOM");
    expect(dressingConflicts.length).toBeGreaterThan(0);
  });

  it("CANCELLED training does not contribute to conflicts", () => {
    const items = canonicalIntegrationFixture();
    expect(conflictPartnerIds(items).size).toBeGreaterThan(0);
    const without = removeCancelledTrainingSessionFromItems(items, "sess-cancel");
    const cancelledStillPresent = without.some((i) => i.id === "training:cancelled");
    expect(cancelledStillPresent).toBe(false);
  });

  it("rename presentation preserves conflict facilityResourceId", () => {
    const renamed = pitchRef(PITCH_MAIN, { name: "Hauptfeld (neu)", code: "HAUPTFELD_NEU" });
    const before = annotateWeekplannerConflicts([training(), matchItem()]);
    const after = annotateWeekplannerConflicts([
      training({ pitchAllocations: [renamed] }),
      matchItem({ pitchAllocations: [renamed] }),
    ]);
    expect(after[0]?.conflicts[0]?.facilityResourceId).toBe(before[0]?.conflicts[0]?.facilityResourceId);
  });
});

describe("08-08D facility lifecycle cross-domain", () => {
  it("ARCHIVE / INACTIVE block new assignment but keep conflict truth on existing refs", () => {
    expect(
      validateAssignableFacilityResource({
        id: PITCH_MAIN,
        tenantId: TENANT,
        status: "ARCHIVED",
        type: "FULL_PITCH",
        facility: { id: FAC_PARENT, status: "ACTIVE" },
      }),
    ).toBe("ARCHIVED_RESOURCE");

    const archivedLabel = pitchRef(PITCH_MAIN, { name: "Hauptfeld (archiviert)" });
    const partners = conflictPartnerIds([
      training({ pitchAllocations: [archivedLabel] }),
      matchItem({ pitchAllocations: [archivedLabel] }),
    ]);
    expect(partners.size).toBeGreaterThan(0);
  });

  it("REACTIVATE restores assignability without changing resource id", () => {
    expect(
      validateAssignableFacilityResource({
        id: PITCH_MAIN,
        tenantId: TENANT,
        status: "ACTIVE",
        type: "FULL_PITCH",
        facility: { id: FAC_PARENT, status: "ACTIVE" },
      }),
    ).toBeNull();
  });
});

describe("08-08D match compatibility integration", () => {
  it("CODE_RENAME — stale Match code resolves to same physical resource via alias map", () => {
    const merged = mergeLegacyMatchCodeToResourceIdMap(new Map([["HAUPTFELD_NEU", PITCH_MAIN]]), [
      { code: "HAUPTFELD", facilityResourceId: PITCH_MAIN },
    ]);
    expect(lookupMatchLegacyResourceId(merged, "HAUPTFELD")).toBe(PITCH_MAIN);
    expect(lookupMatchLegacyResourceId(merged, "HAUPTFELD_NEU")).toBe(PITCH_MAIN);
  });

  it("CODE_REUSE — retired alias prevents binding old code to a new resource", async () => {
    const db = {
      facilityResource: {
        findFirst: vi.fn().mockResolvedValue({ id: "res-other" }),
      },
      facilityResourceCodeAlias: {
        findFirst: vi.fn().mockResolvedValue({ id: "alias-1" }),
      },
    };
    await expect(
      assertFacilityResourceCodeAvailable(db, TENANT, "HAUPTFELD"),
    ).rejects.toThrow(/Code existiert/);
  });

  it("REALLOCATION changes physical resource identity on Match item", () => {
    const reallocated = matchItem({
      pitchAllocations: [pitchRef(PITCH_SECOND, { code: "KR2" })],
    });
    expect(reallocated.pitchAllocations[0]?.facilityResourceId).toBe(PITCH_SECOND);
    expect(reallocated.pitchAllocations[0]?.facilityResourceId).not.toBe(PITCH_MAIN);
  });
});

describe("08-08D delete-guard completeness", () => {
  const expectedKeys: (keyof FacilityResourceReferenceCounts)[] = [
    "trainingAllocations",
    "trainingSessionAllocations",
    "tournamentResourceAllocations",
    "tournamentParticipantAllocations",
    "weekplannerPlanAllocations",
    "eventFacilityAllocations",
    "matchLegacyReferences",
  ];

  it("REFERENCE_MODELS — guard counts every operational FacilityResource FK + Match legacy", () => {
    expect(expectedKeys.sort()).toEqual(
      (
        [
          "trainingAllocations",
          "trainingSessionAllocations",
          "tournamentResourceAllocations",
          "tournamentParticipantAllocations",
          "weekplannerPlanAllocations",
          "eventFacilityAllocations",
          "matchLegacyReferences",
        ] satisfies (keyof FacilityResourceReferenceCounts)[]
      ).sort(),
    );
  });

  it("counts are tenant-scoped (cross-tenant resource returns zero operational refs)", async () => {
    const db = {
      trainingAllocation: { count: vi.fn().mockResolvedValue(0) },
      trainingSessionAllocation: { count: vi.fn().mockResolvedValue(0) },
      tournamentResourceAllocation: { count: vi.fn().mockResolvedValue(0) },
      tournamentParticipantAllocation: { count: vi.fn().mockResolvedValue(0) },
      weekplannerPlanAllocation: { count: vi.fn().mockResolvedValue(0) },
      eventFacilityAllocation: { count: vi.fn().mockResolvedValue(0) },
      event: { findMany: vi.fn().mockResolvedValue([]) },
      facilityResourceCodeAlias: { findMany: vi.fn().mockResolvedValue([]) },
      facilityResource: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const counts = await countFacilityResourceReferences(db, TENANT_OTHER, PITCH_MAIN);
    expect(totalFacilityResourceReferences(counts)).toBe(0);
    expect(db.trainingAllocation.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_OTHER, facilityResourceId: PITCH_MAIN } }),
    );
  });
});

describe("08-08D tenant isolation", () => {
  it("alias map is built per-tenant caller context — identical codes do not cross tenants", () => {
    const tenantA = mergeLegacyMatchCodeToResourceIdMap(new Map([["KR2", "res-a"]]), []);
    const tenantB = mergeLegacyMatchCodeToResourceIdMap(new Map([["KR2", "res-b"]]), []);
    expect(lookupMatchLegacyResourceId(tenantA, "KR2")).toBe("res-a");
    expect(lookupMatchLegacyResourceId(tenantB, "KR2")).toBe("res-b");
  });

  it("manipulation tenant scope rejects cross-tenant item mutation", () => {
    expect(() =>
      assertManipulationTenantScope(training({ tenantId: TENANT_OTHER }), TENANT),
    ).toThrow(ManipulationForbiddenError);
  });
});

describe("08-08D permission boundaries (automated regression)", () => {
  it("read-only actor cannot mutate resource reservations", () => {
    const readOnly = {
      canManageTrainings: false,
      canManageEvents: false,
      canManageAllocations: false,
    };
    expect(canMutateResourceReservationForItem(training(), readOnly)).toBe(false);
  });

  it("allocation manager can mutate reservations but is not implied facility admin", () => {
    const allocationManager = {
      canManageTrainings: false,
      canManageEvents: false,
      canManageAllocations: true,
    };
    expect(canMutateResourceReservationForItem(training(), allocationManager)).toBe(true);
    expect(allocationManager.canManageTrainings).toBe(false);
  });
});

describe("08-08D aggregation regression (F-08-08-05)", () => {
  it("mixed cluster headline remains neutral count copy", () => {
    const mixed = [
      matchItem(),
      ...Array.from({ length: 3 }, (_, i) =>
        training({ id: `training:${i}`, trainingSessionId: `sess-${i}` }),
      ),
    ];
    const summary = summarizeAggregateCluster(mixed);
    expect(summary.headline).toBe("4 Aktivitäten");
  });
});

// ── Availability (mocked prisma — same seam as 08-08C) ─────────────────────

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

beforeEach(() => {
  vi.clearAllMocks();
  availabilityMocks.trainingSessionFindMany.mockResolvedValue([]);
  availabilityMocks.eventFindMany.mockResolvedValue([]);
  availabilityMocks.tournamentResourceAllocationFindMany.mockResolvedValue([]);
  availabilityMocks.tournamentParticipantAllocationFindMany.mockResolvedValue([]);
  availabilityMocks.eventFacilityAllocationFindMany.mockResolvedValue([]);
  availabilityMocks.facilityResourceCodeAliasFindMany.mockResolvedValue([]);
});

describe("08-08D cross-domain availability", () => {
  const AV_START = T_OVERLAP_START.toISOString();
  const AV_END = T_OVERLAP_END.toISOString();
  const ACTIVE_MAIN = {
    id: PITCH_MAIN,
    name: "Hauptfeld",
    code: "HAUPTFELD",
    type: "FULL_PITCH",
    facilityId: FAC_PARENT,
    facility: { name: "Hauptfeld" },
  };

  it("TRAINING occupancy marks pitch OCCUPIED", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_MAIN]);
    availabilityMocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "sess-main",
        startAt: T_OVERLAP_START,
        endAt: T_OVERLAP_END,
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Training",
          allocations: [{ facilityResourceId: PITCH_MAIN, facilityResource: { type: "FULL_PITCH" } }],
        },
        sessionAllocations: [],
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

  it("MATCH legacy pitchCode occupancy via alias after rename", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([
      { ...ACTIVE_MAIN, code: "HAUPTFELD_NEU" },
    ]);
    availabilityMocks.facilityResourceCodeAliasFindMany.mockResolvedValue([
      { code: "HAUPTFELD", facilityResourceId: PITCH_MAIN },
    ]);
    availabilityMocks.eventFindMany.mockResolvedValue([
      {
        id: "ev-match",
        title: "Spiel",
        opponentName: "Gegner",
        startAt: T_OVERLAP_START,
        endAt: T_OVERLAP_END,
        pitchCode: "HAUPTFELD",
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

  it("TOURNAMENT + EVENT allocations mark pitch occupied", async () => {
    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_MAIN]);
    availabilityMocks.tournamentResourceAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: PITCH_MAIN,
        event: {
          id: "ev-tournament",
          title: "Turnier",
          startAt: T_OVERLAP_START,
          endAt: T_OVERLAP_END,
        },
      },
    ]);
    availabilityMocks.eventFacilityAllocationFindMany.mockResolvedValue([
      {
        facilityResourceId: PITCH_MAIN,
        facilityResource: { type: "FULL_PITCH" },
        event: {
          id: "ev-other",
          title: "Event",
          startAt: T_OVERLAP_START,
          endAt: T_OVERLAP_END,
        },
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

  it("CONFLICT_AVAILABILITY_CONSISTENCY — overlapping training implies OCCUPIED", async () => {
    const items = [training(), training({ id: "training:b", trainingSessionId: "sess-b" })];
    expect(conflictPartnerIds(items).size).toBeGreaterThan(0);

    availabilityMocks.facilityResourceFindMany.mockResolvedValue([ACTIVE_MAIN]);
    availabilityMocks.trainingSessionFindMany.mockResolvedValue([
      {
        id: "sess-main",
        startAt: T_OVERLAP_START,
        endAt: T_OVERLAP_END,
        overrideStartAt: null,
        overrideEndAt: null,
        trainingSeries: {
          title: "Training",
          allocations: [{ facilityResourceId: PITCH_MAIN, facilityResource: { type: "FULL_PITCH" } }],
        },
        sessionAllocations: [],
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
});
