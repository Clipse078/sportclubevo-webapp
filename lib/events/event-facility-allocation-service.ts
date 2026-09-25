/**
 * PLANNING-UX-07R6 — canonical FacilityResource allocations for club events
 * (Event.type=OTHER / Veranstaltungen).
 *
 * MATCH and TOURNAMENT facility persistence is intentionally unchanged in R6.
 * Writes are scoped to Event.type=OTHER only.
 */

import { prisma } from "@/lib/db/prisma";
import { isMeaningfulEventInterval } from "@/lib/facilities/resource-occupancy-window";
import {
  loadTenantFacilityResourceForWrite,
  validateAssignableFacilityResource,
} from "@/lib/facilities/facility-resource-write-validation";
import { isGenericAllocatableFacilityResourceType } from "@/lib/facilities/facility-resource-classification";
import { ClubEventNotFoundError } from "@/lib/events/club-events-service";
import type {
  CreateEventFacilityAllocationInput,
  EventFacilityAllocationDto,
  ReplaceEventFacilityAllocationInput,
} from "@/lib/events/event-facility-allocation-types";
import {
  EventFacilityAllocationArchivedFacilityError,
  EventFacilityAllocationArchivedResourceError,
  EventFacilityAllocationDuplicateError,
  EventFacilityAllocationInvalidEventTimeError,
  EventFacilityAllocationNotFoundError,
  EventFacilityAllocationResourceNotFoundError,
  EventFacilityAllocationUnsupportedResourceTypeError,
} from "@/lib/events/event-facility-allocation-errors";

const allocationInclude = {
  facilityResource: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      facilityId: true,
      facility: { select: { name: true } },
    },
  },
} as const;

type AllocationRow = {
  id: string;
  eventId: string;
  notes: string | null;
  displayOrder: number;
  facilityResource: {
    id: string;
    code: string;
    name: string;
    type: string;
    facilityId: string;
    facility: { name: string };
  };
};

function toDto(row: AllocationRow): EventFacilityAllocationDto {
  return {
    id: row.id,
    facilityResourceId: row.facilityResource.id,
    facilityResourceCode: row.facilityResource.code,
    facilityResourceName: row.facilityResource.name,
    facilityResourceType: row.facilityResource.type,
    facilityId: row.facilityResource.facilityId,
    facilityName: row.facilityResource.facility.name,
    notes: row.notes,
    displayOrder: row.displayOrder,
  };
}

async function requireClubEvent(tenantId: string, eventId: string): Promise<{
  id: string;
  startAt: Date;
  endAt: Date | null;
}> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: { id: true, startAt: true, endAt: true },
  });
  if (!event) throw new ClubEventNotFoundError();
  return event;
}

function assertEventTimeContext(event: { id: string; startAt: Date; endAt: Date | null }): void {
  const endAt = event.endAt ?? event.startAt;
  if (!isMeaningfulEventInterval(event.startAt, endAt)) {
    throw new EventFacilityAllocationInvalidEventTimeError(event.id);
  }
}

async function validateResourceForClubEvent(
  tenantId: string,
  facilityResourceId: string,
): Promise<NonNullable<Awaited<ReturnType<typeof loadTenantFacilityResourceForWrite>>>> {
  const resource = await loadTenantFacilityResourceForWrite(tenantId, facilityResourceId);
  switch (validateAssignableFacilityResource(resource)) {
    case "NOT_FOUND":
      throw new EventFacilityAllocationResourceNotFoundError(facilityResourceId);
    case "ARCHIVED_RESOURCE":
      throw new EventFacilityAllocationArchivedResourceError(facilityResourceId);
    case "ARCHIVED_FACILITY":
      throw new EventFacilityAllocationArchivedFacilityError(resource!.facility.id);
    case null:
      break;
  }
  if (!resource) throw new EventFacilityAllocationResourceNotFoundError(facilityResourceId);

  if (!isGenericAllocatableFacilityResourceType(resource.type)) {
    throw new EventFacilityAllocationUnsupportedResourceTypeError(resource.type);
  }

  return resource;
}

async function requireAllocation(tenantId: string, allocationId: string): Promise<AllocationRow> {
  const allocation = await prisma.eventFacilityAllocation.findFirst({
    where: { id: allocationId, tenantId },
    include: allocationInclude,
  });
  if (!allocation) throw new EventFacilityAllocationNotFoundError(allocationId);
  return allocation as unknown as AllocationRow;
}

export async function listEventFacilityAllocations(
  tenantId: string,
  eventId: string,
): Promise<EventFacilityAllocationDto[]> {
  await requireClubEvent(tenantId, eventId);

  const rows = await prisma.eventFacilityAllocation.findMany({
    where: { tenantId, eventId },
    include: allocationInclude,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return (rows as unknown as AllocationRow[]).map(toDto);
}

export async function assignEventFacilityResource(
  tenantId: string,
  eventId: string,
  input: CreateEventFacilityAllocationInput,
): Promise<EventFacilityAllocationDto> {
  const event = await requireClubEvent(tenantId, eventId);
  assertEventTimeContext(event);

  const { facilityResourceId, notes, displayOrder } = input;
  await validateResourceForClubEvent(tenantId, facilityResourceId);

  let order = displayOrder;
  if (order === undefined) {
    const maxRow = await prisma.eventFacilityAllocation.aggregate({
      where: { eventId },
      _max: { displayOrder: true },
    });
    order = (maxRow._max.displayOrder ?? -1) + 1;
  }

  try {
    const allocation = await prisma.eventFacilityAllocation.create({
      data: {
        tenantId,
        eventId,
        facilityResourceId,
        notes: notes ?? null,
        displayOrder: order,
      },
      include: allocationInclude,
    });
    return toDto(allocation as unknown as AllocationRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique constraint")) {
      throw new EventFacilityAllocationDuplicateError(eventId, facilityResourceId);
    }
    throw err;
  }
}

export async function unassignEventFacilityResource(
  tenantId: string,
  allocationId: string,
): Promise<void> {
  await requireAllocation(tenantId, allocationId);
  await prisma.eventFacilityAllocation.delete({ where: { id: allocationId } });
}

export async function replaceEventFacilityResource(
  tenantId: string,
  allocationId: string,
  input: ReplaceEventFacilityAllocationInput,
): Promise<EventFacilityAllocationDto> {
  const existing = await requireAllocation(tenantId, allocationId);
  const event = await requireClubEvent(tenantId, existing.eventId);
  assertEventTimeContext(event);

  const { facilityResourceId } = input;
  if (facilityResourceId === existing.facilityResource.id) {
    return toDto(existing);
  }

  await validateResourceForClubEvent(tenantId, facilityResourceId);

  try {
    const updated = await prisma.eventFacilityAllocation.update({
      where: { id: allocationId },
      data: { facilityResourceId },
      include: allocationInclude,
    });
    return toDto(updated as unknown as AllocationRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique constraint")) {
      throw new EventFacilityAllocationDuplicateError(existing.eventId, facilityResourceId);
    }
    throw err;
  }
}
