import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { InitiativeStatus, VisibilityScope } from "@prisma/client";
import { getInitiativeById } from "@/lib/initiatives/queries";
import { requireInitiativeAccess } from "@/lib/visibility/visibility-guards";
import { logAuditEvent } from "@/lib/audit/audit-log";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";
import { shouldInvalidateInitiativeApproval } from "@/lib/club-development/initiative-approval-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const initiative = await getInitiativeById(id, access.context.actor);

  if (!initiative) {
    return NextResponse.json({ error: "Initiative nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ initiative });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;

  const guard = await requireInitiativeAccess({ actor, id, access: "write" });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validStatuses = Object.values(InitiativeStatus);

    const existingDetail = await prisma.initiative.findFirst({
      where: { id, tenantId },
      select: {
        title: true,
        summary: true,
        description: true,
        approvalRequired: true,
        approvalContentRevision: true,
        approvedContentHash: true,
      },
    });

    const nextTitle = body?.title !== undefined ? String(body.title).trim() : existingDetail?.title ?? "";
    const nextSummary =
      body?.summary !== undefined ? body.summary?.trim() || null : existingDetail?.summary ?? null;
    const nextDescription =
      body?.description !== undefined
        ? body.description?.trim() || null
        : existingDetail?.description ?? null;

    const fieldsChanged =
      nextTitle !== (existingDetail?.title ?? "") ||
      nextSummary !== (existingDetail?.summary ?? null) ||
      nextDescription !== (existingDetail?.description ?? null);

    const invalidate = existingDetail
      ? shouldInvalidateInitiativeApproval({
          approvedContentHash: existingDetail.approvedContentHash,
          title: nextTitle,
          summary: nextSummary,
          description: nextDescription,
          approvalContentRevision: existingDetail.approvalContentRevision,
          approvalRequired: existingDetail.approvalRequired,
          fieldsChanged,
        })
      : false;

    const data: Record<string, unknown> = {
      title: body?.title?.trim() || undefined,
      summary: body?.summary !== undefined ? body.summary?.trim() || null : undefined,
      description: body?.description !== undefined ? body.description?.trim() || null : undefined,
      status: validStatuses.includes(body?.status as InitiativeStatus)
        ? (body.status as InitiativeStatus)
        : undefined,
      dueDate:
        body?.dueDate !== undefined
          ? body.dueDate
            ? new Date(body.dueDate)
            : null
          : undefined,
      visibilityScope: Object.values(VisibilityScope).includes(body?.visibilityScope as VisibilityScope)
        ? (body.visibilityScope as VisibilityScope)
        : undefined,
      requiresFourEyeReview:
        typeof body?.requiresFourEyeReview === "boolean"
          ? body.requiresFourEyeReview
          : undefined,
      visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs) ? body.visibleOrgUnitRefs : undefined,
      visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? body.visibleRoleRefs : undefined,
      visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? body.visibleUserRefs : undefined,
      visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs) ? body.visibleTargetGroupRefs : undefined,
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

    const updated = await prisma.initiative.update({
      where: { id, tenantId },
      data,
      select: { id: true, slug: true, title: true },
    });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "initiatives",
      entityId: id,
      action: "UPDATE",
      before: { id: guard.entity.id, slug: guard.entity.slug, reviewStage: guard.entity.reviewStage },
      after: { id: updated.id, slug: updated.slug, title: updated.title },
    });

    return NextResponse.json({ initiative: updated });
  } catch (error) {
    console.error("Update initiative failed:", error);
    return NextResponse.json(
      { error: "Initiative konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id } = await params;
  const { actor, tenantId } = access.context;

  const guard = await requireInitiativeAccess({ actor, id, access: "delete" });
  if (!guard.ok) return guard.response;

  try {
    await prisma.initiative.delete({ where: { id, tenantId } });

    void logAuditEvent({
      actorUserId: actor.userId,
      module: "initiatives",
      entityId: id,
      action: "DELETE",
      before: { id: guard.entity.id, slug: guard.entity.slug, reviewStage: guard.entity.reviewStage },
      after: null,
    });

    return NextResponse.json({ message: "Initiative wurde gelöscht." });
  } catch (error) {
    console.error("Delete initiative failed:", error);
    return NextResponse.json(
      { error: "Initiative konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
