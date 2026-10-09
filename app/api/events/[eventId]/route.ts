/**
 * CLUB-EVENTS-01: Individual event operations (Veranstaltungen / type=OTHER).
 *
 * GET    /api/events/[eventId]  — Fetch a single event (tenant-scoped).
 * PATCH  /api/events/[eventId]  — Update a Veranstaltung (archive/restore/edit).
 * DELETE /api/events/[eventId]  — Archive (soft-delete) or permanently delete.
 *
 * Authorization:
 *   GET                         — EVENTS_VIEW or EVENTS_MANAGE
 *   PATCH (edit / archive /restore) — EVENTS_MANAGE
 *   DELETE (archive, no ?permanent) — EVENTS_MANAGE
 *   DELETE ?permanent=true      — EVENTS_DELETE (via hasTenantDeletionAuthority,
 *                                  NOT EVENTS_MANAGE — follows ADMIN-DELETE-02A pattern)
 *
 * CLUB-EVENTS-01-C1: permanent deletion requires the explicit events.delete
 * permission resolved against the event's own DB-stored tenantId. The
 * session's activeTenantId is never used as the authorization target for
 * this path — the event's real owning tenant is always resolved from the DB.
 *
 * Tenant isolation: enforced at every layer; type=OTHER restriction prevents
 * this route from operating on Matches, Tournaments, or Trainings.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { logAction } from "@/lib/audit/log-action";
import {
  getClubEvent,
  updateClubEvent,
  archiveClubEvent,
  restoreClubEvent,
  deleteClubEvent,
  ClubEventNotFoundError,
  ClubEventValidationError,
} from "@/lib/events/club-events-service";
import {
  ClubEventScheduleError,
  parseClubEventScheduleFromApiBody,
} from "@/lib/events/club-event-api-scheduling";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { loadClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import {
  parseCollaborationCycleBaselineFromBody,
  stripCollaborationCycleBaselineFromBody,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { resolveTenantKeyForCollaboration } from "@/lib/collaboration/resolve-tenant-key";
import { buildClubEventApiCollaborationPayload } from "@/lib/collaboration/club-event/club-event-api-collaboration";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ eventId: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const access = await requireApiAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: "Kein Mandanten-Kontext." },
      { status: 403 },
    );
  }

  const { eventId } = await params;
  const event = await getClubEvent(tenantId, eventId);

  if (!event) {
    return NextResponse.json(
      { error: "Veranstaltung nicht gefunden." },
      { status: 404 },
    );
  }

  return NextResponse.json({ event });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const access = await requireApiPermission(PERMISSIONS.EVENTS_MANAGE);

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: "Kein Mandanten-Kontext." },
      { status: 403 },
    );
  }

  const actorUserId =
    access.session.user.effectiveUserId ?? access.session.user.id ?? null;
  const { eventId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const cycleBaseline = parseCollaborationCycleBaselineFromBody(raw, "CLUB_EVENT", eventId);
  const mutationBody = stripCollaborationCycleBaselineFromBody(raw);

  // Handle archive/restore action — both remain under EVENTS_MANAGE
  if (mutationBody.action === "archive") {
    try {
      const event = await archiveClubEvent(tenantId, eventId);
      await logAction({
        actorUserId,
        moduleKey: "veranstaltungen",
        entityType: "Event",
        entityId: eventId,
        action: "ARCHIVE",
        afterJson: { status: "ARCHIVED" },
      });
      return NextResponse.json({ event });
    } catch (err) {
      if (err instanceof ClubEventNotFoundError) {
        return NextResponse.json(
          { error: "Veranstaltung nicht gefunden." },
          { status: 404 },
        );
      }
      if (err instanceof ClubEventValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("[veranstaltungen] PATCH archive error:", err);
      return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
    }
  }

  if (mutationBody.action === "restore") {
    try {
      const event = await restoreClubEvent(tenantId, eventId);
      await logAction({
        actorUserId,
        moduleKey: "veranstaltungen",
        entityType: "Event",
        entityId: eventId,
        action: "RESTORE",
        afterJson: { status: "SCHEDULED" },
      });
      return NextResponse.json({ event });
    } catch (err) {
      if (err instanceof ClubEventNotFoundError) {
        return NextResponse.json(
          { error: "Veranstaltung nicht gefunden." },
          { status: 404 },
        );
      }
      console.error("[veranstaltungen] PATCH restore error:", err);
      return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
    }
  }

  // Core field update — remains under EVENTS_MANAGE
  const input: Parameters<typeof updateClubEvent>[2] = {};

  if (mutationBody.title !== undefined) input.title = String(mutationBody.title ?? "");
  if (mutationBody.description !== undefined)
    input.description =
      mutationBody.description === null ? null : String(mutationBody.description) || null;
  if (mutationBody.location !== undefined)
    input.location =
      mutationBody.location === null ? null : String(mutationBody.location) || null;

  const scheduleTouched =
    mutationBody.allDay !== undefined ||
    mutationBody.startDate !== undefined ||
    mutationBody.endDate !== undefined ||
    mutationBody.startTime !== undefined ||
    mutationBody.endTime !== undefined ||
    mutationBody.startAt !== undefined ||
    mutationBody.endAt !== undefined;

  if (scheduleTouched) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const timeZone = resolveTenantEventTimezone(tenant?.timezone);
    const existing = await getClubEvent(tenantId, eventId);
    if (!existing) {
      return NextResponse.json(
        { error: "Veranstaltung nicht gefunden." },
        { status: 404 },
      );
    }

    try {
      const schedule = parseClubEventScheduleFromApiBody(
        {
          allDay:
            mutationBody.allDay !== undefined ? Boolean(mutationBody.allDay) : undefined,
          startAt:
            mutationBody.startAt !== undefined &&
            mutationBody.startAt !== null &&
            mutationBody.startAt !== ""
              ? String(mutationBody.startAt)
              : undefined,
          endAt:
            mutationBody.endAt === null
              ? null
              : mutationBody.endAt !== undefined && mutationBody.endAt !== ""
                ? String(mutationBody.endAt)
                : undefined,
          startDate:
            mutationBody.startDate !== undefined && mutationBody.startDate !== null
              ? String(mutationBody.startDate)
              : undefined,
          endDate:
            mutationBody.endDate !== undefined && mutationBody.endDate !== null
              ? String(mutationBody.endDate)
              : undefined,
          startTime:
            mutationBody.startTime !== undefined && mutationBody.startTime !== null
              ? String(mutationBody.startTime)
              : undefined,
          endTime:
            mutationBody.endTime !== undefined && mutationBody.endTime !== null
              ? String(mutationBody.endTime)
              : undefined,
        },
        timeZone,
        existing,
      );
      input.startAt = schedule.startAt;
      input.endAt = schedule.endAt;
      input.allDay = schedule.allDay;
    } catch (err) {
      if (err instanceof ClubEventScheduleError) {
        return NextResponse.json(
          { error: err.message, field: err.field },
          { status: 400 },
        );
      }
      throw err;
    }
  }
  if (mutationBody.organizerName !== undefined)
    input.organizerName =
      mutationBody.organizerName === null ? null : String(mutationBody.organizerName) || null;
  if (mutationBody.remarks !== undefined)
    input.remarks =
      mutationBody.remarks === null ? null : String(mutationBody.remarks) || null;
  if (mutationBody.websiteVisible !== undefined)
    input.websiteVisible = Boolean(mutationBody.websiteVisible);
  if (mutationBody.infoboardVisible !== undefined)
    input.infoboardVisible = Boolean(mutationBody.infoboardVisible);
  if (mutationBody.homepageVisible !== undefined)
    input.homepageVisible = Boolean(mutationBody.homepageVisible);
  if (mutationBody.wochenplanVisible !== undefined)
    input.wochenplanVisible = Boolean(mutationBody.wochenplanVisible);
  if (mutationBody.trainingsplanVisible !== undefined)
    input.trainingsplanVisible = Boolean(mutationBody.trainingsplanVisible);
  if (mutationBody.teamPageVisible !== undefined)
    input.teamPageVisible = Boolean(mutationBody.teamPageVisible);

  try {
    const tenantKey = await resolveTenantKeyForCollaboration(tenantId);
    const beforeSnapshot = await loadClubEventActivitySnapshot({ tenantId, eventId });
    const event = await updateClubEvent(tenantId, eventId, input);
    await logAction({
      actorUserId,
      moduleKey: "veranstaltungen",
      entityType: "Event",
      entityId: eventId,
      action: "UPDATE",
      afterJson: input,
    });
    const collaborationPayload = await buildClubEventApiCollaborationPayload({
      tenantId,
      tenantKey,
      userId: actorUserId ?? "",
      eventId,
      beforeSnapshot,
      cycleBaseline,
    });
    return NextResponse.json({
      event,
      ...collaborationPayload,
    });
  } catch (err) {
    if (err instanceof ClubEventNotFoundError) {
      return NextResponse.json(
        { error: "Veranstaltung nicht gefunden." },
        { status: 404 },
      );
    }
    if (err instanceof ClubEventValidationError) {
      return NextResponse.json(
        { error: err.message, field: err.field },
        { status: 400 },
      );
    }
    console.error("[veranstaltungen] PATCH error:", err);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
//
// CLUB-EVENTS-01-C1 authorization split:
//   ?permanent=true  → requires events.delete via hasTenantDeletionAuthority,
//                       resolved against the event's own DB tenantId.
//   (no ?permanent)  → archive (soft-delete), requires events.manage.
//
// The permanent path intentionally does NOT call requireApiPermission first —
// a caller holding only events.delete (without events.manage) must still be
// able to permanently delete. The archive path uses requireApiPermission
// (events.manage) independently.

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const url = new URL(request.url);
  const permanent = url.searchParams.get("permanent") === "true";
  const { eventId } = await params;

  // ── Permanent delete path: events.delete required ─────────────────────────
  if (permanent) {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeTenantId = session.user.activeTenantId;
    if (!activeTenantId) {
      return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
    }

    // Scope the lookup to the active tenant and type=OTHER so a foreign id is
    // indistinguishable from a missing id and can never select the tenant in
    // which authorization should be evaluated.
    const eventRow = await prisma.event.findFirst({
      where: { id: eventId, type: "OTHER", tenantId: activeTenantId },
      select: { id: true },
    });

    if (!eventRow) {
      return NextResponse.json(
        { error: "Veranstaltung nicht gefunden." },
        { status: 404 },
      );
    }

    const resolver = createEffectivePermissionResolver(prisma);
    const authorized = await resolver.hasTenantDeletionAuthority({
      userId: session.user.id,
      permission: PERMISSIONS.EVENTS_DELETE,
      tenantId: activeTenantId,
    });

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actorUserId =
      session.user.effectiveUserId ?? session.user.id ?? null;

    try {
      await deleteClubEvent(activeTenantId, eventId);
      await logAction({
        actorUserId,
        moduleKey: "veranstaltungen",
        entityType: "Event",
        entityId: eventId,
        action: "DELETE_PERMANENT",
        afterJson: { tenantId: activeTenantId },
      });
      return NextResponse.json({ deleted: true });
    } catch (err) {
      if (err instanceof ClubEventNotFoundError) {
        return NextResponse.json(
          { error: "Veranstaltung nicht gefunden." },
          { status: 404 },
        );
      }
      console.error("[veranstaltungen] DELETE permanent error:", err);
      return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
    }
  }

  // ── Archive (soft-delete) path: events.manage required ───────────────────
  const access = await requireApiPermission(PERMISSIONS.EVENTS_MANAGE);

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: "Kein Mandanten-Kontext." },
      { status: 403 },
    );
  }

  const actorUserId =
    access.session.user.effectiveUserId ?? access.session.user.id ?? null;

  try {
    const event = await archiveClubEvent(tenantId, eventId);
    await logAction({
      actorUserId,
      moduleKey: "veranstaltungen",
      entityType: "Event",
      entityId: eventId,
      action: "ARCHIVE",
      afterJson: { status: "ARCHIVED" },
    });
    return NextResponse.json({ event });
  } catch (err) {
    if (err instanceof ClubEventNotFoundError) {
      return NextResponse.json(
        { error: "Veranstaltung nicht gefunden." },
        { status: 404 },
      );
    }
    if (err instanceof ClubEventValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[veranstaltungen] DELETE archive error:", err);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
