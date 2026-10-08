/**
 * SCE-PLANNER-UX-08-08A — facility/resource permanent delete safety.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FACILITY_LIFECYCLE_ERROR_CODES,
  FacilityLifecycleError,
} from "../facility-lifecycle-errors";

const mocks = vi.hoisted(() => ({
  facilityResourceFindFirst: vi.fn(),
  facilityResourceDelete: vi.fn(),
  facilityFindFirst: vi.fn(),
  facilityDelete: vi.fn(),
  facilityResourceFindMany: vi.fn(),
  trainingAllocationCount: vi.fn(),
  trainingSessionAllocationCount: vi.fn(),
  tournamentResourceAllocationCount: vi.fn(),
  tournamentParticipantAllocationCount: vi.fn(),
  weekplannerPlanAllocationCount: vi.fn(),
  eventFacilityAllocationCount: vi.fn(),
  eventFindMany: vi.fn(),
  facilityResourceCodeAliasFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facilityResource: {
      findFirst: (...args: unknown[]) => mocks.facilityResourceFindFirst(...args),
      findMany: (...args: unknown[]) => mocks.facilityResourceFindMany(...args),
      delete: (...args: unknown[]) => mocks.facilityResourceDelete(...args),
    },
    facility: {
      findFirst: (...args: unknown[]) => mocks.facilityFindFirst(...args),
      delete: (...args: unknown[]) => mocks.facilityDelete(...args),
    },
    trainingAllocation: { count: (...args: unknown[]) => mocks.trainingAllocationCount(...args) },
    trainingSessionAllocation: {
      count: (...args: unknown[]) => mocks.trainingSessionAllocationCount(...args),
    },
    tournamentResourceAllocation: {
      count: (...args: unknown[]) => mocks.tournamentResourceAllocationCount(...args),
    },
    tournamentParticipantAllocation: {
      count: (...args: unknown[]) => mocks.tournamentParticipantAllocationCount(...args),
    },
    weekplannerPlanAllocation: {
      count: (...args: unknown[]) => mocks.weekplannerPlanAllocationCount(...args),
    },
    eventFacilityAllocation: {
      count: (...args: unknown[]) => mocks.eventFacilityAllocationCount(...args),
    },
    event: { findMany: (...args: unknown[]) => mocks.eventFindMany(...args) },
    facilityResourceCodeAlias: {
      findMany: (...args: unknown[]) => mocks.facilityResourceCodeAliasFindMany(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mocks.transaction(fn),
  },
}));

import {
  deleteFacilityPermanently,
  deleteFacilityResourcePermanently,
  getFacilityDeletionImpact,
  getFacilityResourceDeletionImpact,
} from "../facility-delete-service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const RESOURCE_ID = "res-pitch";
const FACILITY_ID = "fac-1";

function makeTx() {
  return {
    facilityResource: {
      findFirst: mocks.facilityResourceFindFirst,
      findMany: mocks.facilityResourceFindMany,
      delete: mocks.facilityResourceDelete,
    },
    facility: {
      findFirst: mocks.facilityFindFirst,
      delete: mocks.facilityDelete,
    },
    trainingAllocation: { count: mocks.trainingAllocationCount },
    trainingSessionAllocation: { count: mocks.trainingSessionAllocationCount },
    tournamentResourceAllocation: { count: mocks.tournamentResourceAllocationCount },
    tournamentParticipantAllocation: { count: mocks.tournamentParticipantAllocationCount },
    weekplannerPlanAllocation: { count: mocks.weekplannerPlanAllocationCount },
    eventFacilityAllocation: { count: mocks.eventFacilityAllocationCount },
    event: { findMany: mocks.eventFindMany },
    facilityResourceCodeAlias: { findMany: mocks.facilityResourceCodeAliasFindMany },
  };
}

function stubAllReferenceCounts(counts: Partial<Record<string, number>>) {
  const value = (key: string) => counts[key] ?? 0;
  mocks.trainingAllocationCount.mockImplementation(() => Promise.resolve(value("training")));
  mocks.trainingSessionAllocationCount.mockImplementation(() =>
    Promise.resolve(value("session")),
  );
  mocks.tournamentResourceAllocationCount.mockImplementation(() =>
    Promise.resolve(value("tournamentPitch")),
  );
  mocks.tournamentParticipantAllocationCount.mockImplementation(() =>
    Promise.resolve(value("tournamentDressing")),
  );
  mocks.weekplannerPlanAllocationCount.mockImplementation(() =>
    Promise.resolve(value("weekplanner")),
  );
  mocks.eventFacilityAllocationCount.mockImplementation(() => Promise.resolve(value("event")));
  mocks.eventFindMany.mockResolvedValue([]);
  mocks.facilityResourceCodeAliasFindMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (fn) => fn(makeTx()));
});

describe("getFacilityResourceDeletionImpact", () => {
  it("returns null for cross-tenant / missing resource", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue(null);
    expect(await getFacilityResourceDeletionImpact(TENANT_A, RESOURCE_ID)).toBeNull();
  });

  it("marks deletable when all reference counts are zero", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({ id: RESOURCE_ID, code: "STADION" });
    stubAllReferenceCounts({});
    const impact = await getFacilityResourceDeletionImpact(TENANT_A, RESOURCE_ID);
    expect(impact?.deletable).toBe(true);
    expect(impact?.totalReferences).toBe(0);
  });
});

describe("deleteFacilityResourcePermanently", () => {
  it("A — unused pitch: delete succeeds", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({
      id: RESOURCE_ID,
      name: "Hauptfeld",
      code: "STADION",
    });
    stubAllReferenceCounts({});
    mocks.facilityResourceDelete.mockResolvedValue({ id: RESOURCE_ID });

    const result = await deleteFacilityResourcePermanently(TENANT_A, RESOURCE_ID);
    expect(result?.resourceId).toBe(RESOURCE_ID);
    expect(mocks.facilityResourceDelete).toHaveBeenCalledWith({ where: { id: RESOURCE_ID } });
  });

  it("B — referenced pitch: delete blocked (training allocation)", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({
      id: RESOURCE_ID,
      name: "Hauptfeld",
      code: "STADION",
    });
    stubAllReferenceCounts({ training: 1 });

    await expect(deleteFacilityResourcePermanently(TENANT_A, RESOURCE_ID)).rejects.toMatchObject({
      code: FACILITY_LIFECYCLE_ERROR_CODES.RESOURCE_IN_USE,
    });
    expect(mocks.facilityResourceDelete).not.toHaveBeenCalled();
  });

  it("D — match-only pitch reference blocks delete", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({
      id: RESOURCE_ID,
      name: "Kunstrasen 2",
      code: "KR2",
    });
    stubAllReferenceCounts({});
    mocks.eventFindMany.mockResolvedValue([
      { pitchCode: "KR2", homeDressingRoomCode: null, awayDressingRoomCode: null },
    ]);

    await expect(deleteFacilityResourcePermanently(TENANT_A, RESOURCE_ID)).rejects.toMatchObject({
      code: FACILITY_LIFECYCLE_ERROR_CODES.RESOURCE_IN_USE,
    });
    expect(mocks.facilityResourceDelete).not.toHaveBeenCalled();
  });

  it("C — referenced dressing room: delete blocked (participant allocation)", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue({
      id: "res-dr",
      name: "Garderobe E1",
      code: "E1",
    });
    stubAllReferenceCounts({ tournamentDressing: 2 });

    await expect(deleteFacilityResourcePermanently(TENANT_A, "res-dr")).rejects.toBeInstanceOf(
      FacilityLifecycleError,
    );
    expect(mocks.facilityResourceDelete).not.toHaveBeenCalled();
  });

  it("I — tenant-scoped counts (resource lookup requires tenantId)", async () => {
    mocks.facilityResourceFindFirst.mockResolvedValue(null);
    await expect(
      deleteFacilityResourcePermanently(TENANT_B, RESOURCE_ID),
    ).resolves.toBeNull();
    expect(mocks.facilityResourceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RESOURCE_ID, tenantId: TENANT_B } }),
    );
  });
});

describe("deleteFacilityPermanently", () => {
  it("F — facility with referenced child: parent delete blocked", async () => {
    mocks.facilityFindFirst.mockResolvedValue({
      name: "Kunstrasen 2",
      _count: { resources: 2 },
    });
    mocks.facilityResourceFindMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    stubAllReferenceCounts({ session: 1 });

    await expect(deleteFacilityPermanently(TENANT_A, FACILITY_ID)).rejects.toMatchObject({
      code: FACILITY_LIFECYCLE_ERROR_CODES.FACILITY_IN_USE,
    });
    expect(mocks.facilityDelete).not.toHaveBeenCalled();
  });

  it("allows delete when facility and all child resources are unused", async () => {
    mocks.facilityFindFirst.mockResolvedValue({
      name: "Test",
      _count: { resources: 1 },
    });
    mocks.facilityResourceFindMany.mockResolvedValue([{ id: "r1" }]);
    stubAllReferenceCounts({});
    mocks.facilityDelete.mockResolvedValue({ id: FACILITY_ID });

    const result = await deleteFacilityPermanently(TENANT_A, FACILITY_ID);
    expect(result?.facilityId).toBe(FACILITY_ID);
    expect(mocks.facilityDelete).toHaveBeenCalled();
  });
});

describe("getFacilityDeletionImpact", () => {
  it("includes eventFacilityAllocations in facility rollup", async () => {
    mocks.facilityFindFirst.mockResolvedValue({ _count: { resources: 1 } });
    mocks.facilityResourceFindMany.mockResolvedValue([{ id: "r1" }]);
    stubAllReferenceCounts({ event: 3 });

    const impact = await getFacilityDeletionImpact(TENANT_A, FACILITY_ID);
    expect(impact?.totalAllocationRefs).toBe(3);
    expect(impact?.deletable).toBe(false);
  });
});
