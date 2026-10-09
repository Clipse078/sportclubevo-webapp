/**
 * DELETE/PATCH /api/events/[eventId]/facility-allocations/[allocationId]
 *
 * PLANNING-UX-07R6 — remove or replace a Veranstaltung facility allocation.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  replaceEventFacilityResource,
  unassignEventFacilityResource,
} from "@/lib/events/event-facility-allocation-service";
import {
  EventFacilityAllocationArchivedFacilityError,
  EventFacilityAllocationArchivedResourceError,
  EventFacilityAllocationDuplicateError,
  EventFacilityAllocationGroupMismatchError,
  EventFacilityAllocationInvalidEventTimeError,
  EventFacilityAllocationNotFoundError,
  EventFacilityAllocationResourceNotFoundError,
  EventFacilityAllocationUnsupportedResourceTypeError,
} from "@/lib/events/event-facility-allocation-errors";
import { loadClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import {
  parseCollaborationCycleBaselineFromBody,
  stripCollaborationCycleBaselineFromBody,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";
import { buildClubEventApiCollaborationPayload } from "@/lib/collaboration/club-event/club-event-api-collaboration";

type RouteContext = { params: Promise<{ eventId: string; allocationId: string }> };

function mapWriteError(err: unknown): NextResponse | null {
  if (err instanceof EventFacilityAllocationNotFoundError) {
    return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
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
  return null;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { eventId, allocationId } = await params;
  const userId = access.session.user.effectiveUserId ?? access.session.user.id ?? "";
  const rawBody = await request.json().catch(() => ({}));
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const cycleBaseline = parseCollaborationCycleBaselineFromBody(body, "CLUB_EVENT", eventId);

  const existing = await prisma.eventFacilityAllocation.findFirst({
    where: { id: allocationId, tenantId, eventId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
  }

  try {
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const beforeSnapshot = await loadClubEventActivitySnapshot({ tenantId, eventId });
    await unassignEventFacilityResource(tenantId, allocationId);
    revalidatePath(`/dashboard/veranstaltungen/${eventId}/edit`);
    const collaborationPayload = await buildClubEventApiCollaborationPayload({
      tenantId,
      tenantKey,
      userId,
      eventId,
      beforeSnapshot,
      cycleBaseline,
    });
    return NextResponse.json({ ok: true, ...collaborationPayload });
  } catch (err) {
    const mapped = mapWriteError(err);
    if (mapped) return mapped;
    throw err;
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { eventId, allocationId } = await params;
  const userId = access.session.user.effectiveUserId ?? access.session.user.id ?? "";

  const existing = await prisma.eventFacilityAllocation.findFirst({
    where: { id: allocationId, tenantId, eventId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cycleBaseline = parseCollaborationCycleBaselineFromBody(body, "CLUB_EVENT", eventId);
  const mutationBody = stripCollaborationCycleBaselineFromBody(body);

  if (
    typeof mutationBody.facilityResourceId !== "string" ||
    !mutationBody.facilityResourceId.trim()
  ) {
    return NextResponse.json({ error: "facilityResourceId is required." }, { status: 400 });
  }

  try {
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const beforeSnapshot = await loadClubEventActivitySnapshot({ tenantId, eventId });
    const allocation = await replaceEventFacilityResource(tenantId, allocationId, {
      facilityResourceId: mutationBody.facilityResourceId.trim(),
    });
    revalidatePath(`/dashboard/veranstaltungen/${eventId}/edit`);
    const collaborationPayload = await buildClubEventApiCollaborationPayload({
      tenantId,
      tenantKey,
      userId,
      eventId,
      beforeSnapshot,
      cycleBaseline,
    });
    return NextResponse.json({ allocation, ...collaborationPayload });
  } catch (err) {
    const mapped = mapWriteError(err);
    if (mapped) return mapped;
    throw err;
  }
}
