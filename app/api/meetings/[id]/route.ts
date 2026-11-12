import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MeetingStatus, VisibilityScope } from "@prisma/client";
import { getMeetingById } from "@/lib/meetings/queries";
import { resolveMeetingVisibilityOnUpdate } from "@/lib/meetings/meeting-visibility-payload";
import { meetingAllowlistsForPrisma } from "@/lib/meetings/meeting-visibility";
import { requireMeetingAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const meeting = await getMeetingById(id, access.context.actor);

  if (!meeting) {
    return NextResponse.json({ error: "Meeting nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ meeting });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.MEETINGS_MANAGE]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;

  const guard = await requireMeetingAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validStatuses = Object.values(MeetingStatus);

    const visibilityResolved = await resolveMeetingVisibilityOnUpdate(
      body,
      guard.entity.visibilityScope as VisibilityScope,
    );
    if (!visibilityResolved.ok) {
      return NextResponse.json({ error: visibilityResolved.error }, { status: 400 });
    }
    const visibilityPatch = visibilityResolved.payload;

    const updated = await prisma.meeting.update({
      where: { id, tenantId },
      data: {
        title: body?.title?.trim() || undefined,
        description: body?.description?.trim() || null,
        meetingDate: body?.meetingDate ? new Date(body.meetingDate) : undefined,
        location: body?.location?.trim() || null,
        attendeeCount: body?.attendeeCount !== undefined ? Number(body.attendeeCount) || null : undefined,
        plannedDurationMin:
          body?.plannedDurationMin !== undefined
            ? body.plannedDurationMin === null || body.plannedDurationMin === ""
              ? null
              : Math.max(0, Math.trunc(Number(body.plannedDurationMin))) || null
            : undefined,
        status: validStatuses.includes(body?.status as MeetingStatus)
          ? (body.status as MeetingStatus)
          : undefined,
        visibilityScope: visibilityPatch.visibilityScope,
        requiresFourEyeReview:
          typeof body?.requiresFourEyeReview === "boolean"
            ? body.requiresFourEyeReview
            : undefined,
        ...(visibilityPatch.allowlists
          ? meetingAllowlistsForPrisma(visibilityPatch.allowlists)
          : {}),
      },
      select: { id: true, slug: true, title: true },
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "meetings",
      entityId: id,
      action: "UPDATE",
      before: { id: guard.entity.id, slug: guard.entity.slug, reviewStage: guard.entity.reviewStage },
      after: { id: updated.id, slug: updated.slug, title: updated.title },
    });

    return NextResponse.json({ meeting: updated });
  } catch (error) {
    console.error("Update meeting failed:", error);
    return NextResponse.json({ error: "Meeting konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.MEETINGS_MANAGE]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;

  const guard = await requireMeetingAccess({ actor, id, access: "delete" });
  if (!guard.ok) return guard.response;

  try {
    await prisma.meeting.delete({ where: { id, tenantId } });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "meetings",
      entityId: id,
      action: "DELETE",
      before: { id: guard.entity.id, slug: guard.entity.slug, reviewStage: guard.entity.reviewStage },
      after: null,
    });

    return NextResponse.json({ message: "Meeting wurde gelöscht." });
  } catch (error) {
    console.error("Delete meeting failed:", error);
    return NextResponse.json({ error: "Meeting konnte nicht gelöscht werden." }, { status: 500 });
  }
}
