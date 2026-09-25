/**
 * PLANNING-UX-07R6 — EventFacilityAllocation write service tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    facilityResource: { findFirst: vi.fn() },
    eventFacilityAllocation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  assignEventFacilityResource,
  listEventFacilityAllocations,
  replaceEventFacilityResource,
  unassignEventFacilityResource,
} from "../event-facility-allocation-service";
import {
  EventFacilityAllocationArchivedResourceError,
  EventFacilityAllocationDuplicateError,
  EventFacilityAllocationResourceNotFoundError,
} from "../event-facility-allocation-errors";
import { ClubEventNotFoundError } from "../club-events-service";

const TENANT = "tenant-a";
const EVENT_ID = "event-other-1";

function activeResource(type = "FULL_PITCH") {
  return {
    id: "fr-1",
    tenantId: TENANT,
    status: "ACTIVE",
    type,
    facility: { id: "fac-1", status: "ACTIVE" },
  };
}

function allocationRow(id: string, resourceId: string) {
  return {
    id,
    eventId: EVENT_ID,
    notes: null,
    displayOrder: 0,
    facilityResource: {
      id: resourceId,
      code: "KR2",
      name: "Kunstrasen 2",
      type: "FULL_PITCH",
      facilityId: "fac-1",
      facility: { name: "Anlage" },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.event.findFirst).mockResolvedValue({
    id: EVENT_ID,
    startAt: new Date("2026-09-26T16:00:00.000Z"),
    endAt: new Date("2026-09-26T18:00:00.000Z"),
  } as never);
  vi.mocked(prisma.eventFacilityAllocation.aggregate).mockResolvedValue({
    _max: { displayOrder: null },
  } as never);
});

describe("listEventFacilityAllocations", () => {
  it("returns tenant-scoped rows for OTHER events", async () => {
    vi.mocked(prisma.eventFacilityAllocation.findMany).mockResolvedValue([
      allocationRow("alloc-1", "fr-1"),
    ] as never);

    const rows = await listEventFacilityAllocations(TENANT, EVENT_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.facilityResourceId).toBe("fr-1");
  });

  it("rejects non-club events", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    await expect(listEventFacilityAllocations(TENANT, EVENT_ID)).rejects.toBeInstanceOf(
      ClubEventNotFoundError,
    );
  });
});

describe("assignEventFacilityResource", () => {
  it("creates allocation with shared validation", async () => {
    vi.mocked(prisma.facilityResource.findFirst).mockResolvedValue(activeResource() as never);
    vi.mocked(prisma.eventFacilityAllocation.create).mockResolvedValue(
      allocationRow("alloc-1", "fr-1") as never,
    );

    const dto = await assignEventFacilityResource(TENANT, EVENT_ID, {
      facilityResourceId: "fr-1",
    });
    expect(dto.facilityResourceId).toBe("fr-1");
  });

  it("rejects archived resources", async () => {
    vi.mocked(prisma.facilityResource.findFirst).mockResolvedValue({
      ...activeResource(),
      status: "ARCHIVED",
    } as never);

    await expect(
      assignEventFacilityResource(TENANT, EVENT_ID, { facilityResourceId: "fr-1" }),
    ).rejects.toBeInstanceOf(EventFacilityAllocationArchivedResourceError);
  });

  it("maps duplicate constraint to duplicate error", async () => {
    vi.mocked(prisma.facilityResource.findFirst).mockResolvedValue(activeResource() as never);
    vi.mocked(prisma.eventFacilityAllocation.create).mockRejectedValue(
      new Error("Unique constraint failed"),
    );

    await expect(
      assignEventFacilityResource(TENANT, EVENT_ID, { facilityResourceId: "fr-1" }),
    ).rejects.toBeInstanceOf(EventFacilityAllocationDuplicateError);
  });

  it("rejects missing resources (tenant isolation)", async () => {
    vi.mocked(prisma.facilityResource.findFirst).mockResolvedValue(null);
    await expect(
      assignEventFacilityResource(TENANT, EVENT_ID, { facilityResourceId: "missing" }),
    ).rejects.toBeInstanceOf(EventFacilityAllocationResourceNotFoundError);
  });

  it("accepts generic OTHER resources (sport-agnostic portability)", async () => {
    vi.mocked(prisma.facilityResource.findFirst).mockResolvedValue(activeResource("OTHER") as never);
    vi.mocked(prisma.eventFacilityAllocation.create).mockResolvedValue(
      allocationRow("alloc-other", "fr-court-1") as never,
    );

    const dto = await assignEventFacilityResource(TENANT, EVENT_ID, {
      facilityResourceId: "fr-court-1",
    });
    expect(dto.facilityResourceId).toBe("fr-court-1");
  });
});

describe("unassignEventFacilityResource", () => {
  it("deletes by allocation id scoped to tenant", async () => {
    vi.mocked(prisma.eventFacilityAllocation.findFirst).mockResolvedValue(
      allocationRow("alloc-1", "fr-1") as never,
    );
    await unassignEventFacilityResource(TENANT, "alloc-1");
    expect(prisma.eventFacilityAllocation.delete).toHaveBeenCalledWith({ where: { id: "alloc-1" } });
  });
});

describe("replaceEventFacilityResource", () => {
  it("updates facilityResourceId on existing row", async () => {
    vi.mocked(prisma.eventFacilityAllocation.findFirst).mockResolvedValue(
      allocationRow("alloc-1", "fr-1") as never,
    );
    vi.mocked(prisma.facilityResource.findFirst).mockResolvedValue(activeResource() as never);
    vi.mocked(prisma.eventFacilityAllocation.update).mockResolvedValue(
      allocationRow("alloc-1", "fr-2") as never,
    );

    const dto = await replaceEventFacilityResource(TENANT, "alloc-1", {
      facilityResourceId: "fr-2",
    });
    expect(dto.facilityResourceId).toBe("fr-2");
  });
});
