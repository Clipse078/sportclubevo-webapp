/**
 * GET/POST /api/events/[eventId]/facility-allocations
 *
 * PLANNING-UX-07R6 — list/add canonical FacilityResource allocations for
 * Veranstaltungen (Event.type=OTHER). MATCH/TOURNAMENT must not use this route.
 *
 * Permission: EVENTS_VIEW (read) / EVENTS_MANAGE (write)
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ClubEventNotFoundError } from "@/lib/events/club-events-service";
import {
  assignEventFacilityResource,
  listEventFacilityAllocations,
} from "@/lib/events/event-facility-allocation-service";
import {
  EventFacilityAllocationArchivedFacilityError,
  EventFacilityAllocationArchivedResourceError,
  EventFacilityAllocationDuplicateError,
  EventFacilityAllocationGroupMismatchError,
  EventFacilityAllocationInvalidEventTimeError,
  EventFacilityAllocationResourceNotFoundError,
  EventFacilityAllocationUnsupportedResourceTypeError,
} from "@/lib/events/event-facility-allocation-errors";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { eventId } = await params;

  try {
    const allocations = await listEventFacilityAllocations(tenantId, eventId);
    return NextResponse.json({ allocations });
  } catch (err) {
    if (err instanceof ClubEventNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { eventId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.facilityResourceId !== "string" || !body.facilityResourceId.trim()) {
    return NextResponse.json({ error: "facilityResourceId is required." }, { status: 400 });
  }

  try {
    const allocation = await assignEventFacilityResource(tenantId, eventId, {
      facilityResourceId: body.facilityResourceId.trim(),
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    });

    revalidatePath(`/dashboard/veranstaltungen/${eventId}/edit`);

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (err) {
    if (err instanceof ClubEventNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof EventFacilityAllocationResourceNotFoundError) {
      return NextResponse.json({ error: "Ressource nicht gefunden." }, { status: 404 });
    }
    if (
      err instanceof EventFacilityAllocationArchivedResourceError ||
      err instanceof EventFacilityAllocationArchivedFacilityError ||
      err instanceof EventFacilityAllocationInvalidEventTimeError ||
      err instanceof EventFacilityAllocationGroupMismatchError ||
      err instanceof EventFacilityAllocationUnsupportedResourceTypeError
    ) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof EventFacilityAllocationDuplicateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
