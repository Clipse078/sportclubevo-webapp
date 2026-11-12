import { NextRequest, NextResponse } from "next/server";
import { ClubDevelopmentProcessStatus, VisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getClubDevelopmentProcessById } from "@/lib/club-development/process-queries";
import { shouldInvalidateProcessApproval } from "@/lib/club-development/process-approval-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { requireClubDevelopmentProcessAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const process = await getClubDevelopmentProcessById(id, access.context.actor);
  if (!process) {
    return NextResponse.json({ error: "Prozess nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ process });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;

  const guard = await requireClubDevelopmentProcessAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validStatuses = Object.values(ClubDevelopmentProcessStatus);

    const existing = await prisma.clubDevelopmentProcess.findFirst({
      where: { id, tenantId },
      select: {
        title: true,
        summary: true,
        description: true,
        approvalRequired: true,
        approvalContentRevision: true,
        approvedContentHash: true,
        documentRevision: true,
      },
    });

    const nextTitle = body?.title !== undefined ? String(body.title).trim() : existing?.title ?? "";
    const nextSummary =
      body?.summary !== undefined ? body.summary?.trim() || null : existing?.summary ?? null;
    const nextDescription =
      body?.description !== undefined
        ? body.description?.trim() || null
        : existing?.description ?? null;

    const fieldsChanged =
      nextTitle !== (existing?.title ?? "") ||
      nextSummary !== (existing?.summary ?? null) ||
      nextDescription !== (existing?.description ?? null);

    const invalidate = existing
      ? shouldInvalidateProcessApproval({
          approvedContentHash: existing.approvedContentHash,
          title: nextTitle,
          summary: nextSummary,
          description: nextDescription,
          approvalContentRevision: existing.approvalContentRevision,
          approvalRequired: existing.approvalRequired,
          fieldsChanged,
        })
      : false;

    const data: Record<string, unknown> = {
      title: body?.title?.trim() || undefined,
      summary: body?.summary !== undefined ? body.summary?.trim() || null : undefined,
      description: body?.description !== undefined ? body.description?.trim() || null : undefined,
      status: validStatuses.includes(body?.status as ClubDevelopmentProcessStatus)
        ? (body.status as ClubDevelopmentProcessStatus)
        : undefined,
      visibilityScope: Object.values(VisibilityScope).includes(body?.visibilityScope as VisibilityScope)
        ? (body.visibilityScope as VisibilityScope)
        : undefined,
      visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs) ? body.visibleOrgUnitRefs : undefined,
      visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? body.visibleRoleRefs : undefined,
      visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? body.visibleUserRefs : undefined,
      visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs)
        ? body.visibleTargetGroupRefs
        : undefined,
      ...(fieldsChanged ? { documentRevision: { increment: 1 } } : {}),
      ...(invalidate
        ? {
            approvalStatus: "PENDING",
            approvalContentRevision: { increment: 1 },
            approvedContentHash: null,
          }
        : {}),
    };

    if (body?.ownerPersonId !== undefined) {
      const pid = body.ownerPersonId?.trim() || null;
      if (!pid) {
        data.ownerPersonId = null;
        data.owner = body?.owner?.trim() || null;
      } else {
        const snap = await resolveMeetingPersonSnapshot(tenantId, pid);
        if (!snap) {
          return NextResponse.json({ error: "Person nicht gefunden." }, { status: 400 });
        }
        data.ownerPersonId = snap.personId;
        data.owner = snap.displayName;
      }
    } else if (body?.owner !== undefined) {
      data.owner = body?.owner?.trim() || null;
    }

    const updated = await prisma.clubDevelopmentProcess.update({
      where: { id, tenantId },
      data,
      select: { id: true, slug: true, title: true },
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "initiatives",
      entityId: id,
      action: "UPDATE",
      after: updated,
    });

    return NextResponse.json({ process: updated });
  } catch {
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
