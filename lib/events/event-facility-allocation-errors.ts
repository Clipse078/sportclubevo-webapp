/**
 * PLANNING-UX-07R6 — typed errors for Event.type=OTHER facility allocations.
 */

export class EventFacilityAllocationNotFoundError extends Error {
  constructor(allocationId: string) {
    super(`EventFacilityAllocation not found: ${allocationId}`);
    this.name = "EventFacilityAllocationNotFoundError";
  }
}

export class EventFacilityAllocationResourceNotFoundError extends Error {
  constructor(facilityResourceId: string) {
    super(`FacilityResource not found: ${facilityResourceId}`);
    this.name = "EventFacilityAllocationResourceNotFoundError";
  }
}

export class EventFacilityAllocationArchivedResourceError extends Error {
  constructor(facilityResourceId: string) {
    super(`FacilityResource is archived: ${facilityResourceId}`);
    this.name = "EventFacilityAllocationArchivedResourceError";
  }
}

export class EventFacilityAllocationArchivedFacilityError extends Error {
  constructor(facilityId: string) {
    super(`Facility is archived: ${facilityId}`);
    this.name = "EventFacilityAllocationArchivedFacilityError";
  }
}

export class EventFacilityAllocationDuplicateError extends Error {
  constructor(eventId: string, facilityResourceId: string) {
    super(`Resource ${facilityResourceId} is already allocated to event ${eventId}.`);
    this.name = "EventFacilityAllocationDuplicateError";
  }
}

export class EventFacilityAllocationGroupMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventFacilityAllocationGroupMismatchError";
  }
}

export class EventFacilityAllocationUnsupportedResourceTypeError extends Error {
  constructor(type: string) {
    super(`Facility resource type not supported for Veranstaltung allocation: ${type}`);
    this.name = "EventFacilityAllocationUnsupportedResourceTypeError";
  }
}

export class EventFacilityAllocationInvalidEventTimeError extends Error {
  constructor(eventId: string) {
    super(`Event ${eventId} has no meaningful time interval for facility allocation.`);
    this.name = "EventFacilityAllocationInvalidEventTimeError";
  }
}

export class EventFacilityAllocationTenantMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventFacilityAllocationTenantMismatchError";
  }
}
