import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { InitiativeDisposition, InitiativeStatus, VisibilityScope } from "@prisma/client";
import { getInitiatives } from "@/lib/initiatives/queries";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";
import { MeetingApprovalRule } from "@prisma/client";
import { validateApprovalConfig, parseApproverPersonIds } from "@/lib/meetings/meeting-approval-presentation";
import { slugifyInitiativeTitle } from "@/lib/club-development/initiative-slug";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const initiatives = await getInitiatives(access.context.actor);
  return NextResponse.json({ initiatives });
}

export async function POST(request: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const { actor, tenantId } = access.context;

  try {
    const body = await request.json().catch(() => ({}));

    const title = (body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
    }

    const rawSlug = (body?.slug ?? "").trim();
    const slug = rawSlug || slugifyInitiativeTitle(title);

    const existing = await prisma.initiative.findFirst({
      where: { slug, tenantId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Slug "${slug}" ist bereits vergeben.` },
        { status: 409 },
      );
    }

    const validStatuses = Object.values(InitiativeStatus);
    const status: InitiativeStatus = validStatuses.includes(body?.status as InitiativeStatus)
      ? (body.status as InitiativeStatus)
      : InitiativeStatus.PLANNED;

    let owner = body?.owner?.trim() || null;
    let ownerPersonId: string | null = body?.ownerPersonId?.trim() || null;
    if (ownerPersonId) {
      const snap = await resolveMeetingPersonSnapshot(tenantId, ownerPersonId);
      if (!snap) {
        return NextResponse.json({ error: "Person nicht gefunden." }, { status: 400 });
      }
      owner = snap.displayName;
      ownerPersonId = snap.personId;
    }

    const approvalRequired = body?.approvalRequired === true;
    const approvalRule: MeetingApprovalRule =
      Object.values(MeetingApprovalRule).includes(body?.approvalRule)
        ? body.approvalRule
        : MeetingApprovalRule.ALL;
    let approverPersonIds: string[] = [];
    if (Array.isArray(body?.approverPersonIds)) {
      approverPersonIds = parseApproverPersonIds(body.approverPersonIds);
    }
    const approvalValidation = validateApprovalConfig({
      approvalRequired,
      approverPersonIds,
    });
    if (approvalValidation) {
      return NextResponse.json({ error: approvalValidation }, { status: 400 });
    }

    const created = await prisma.initiative.create({
      data: {
        tenantId,
        slug,
        title,
        summary: body?.summary?.trim() || null,
        description: body?.description?.trim() || null,
        status,
        owner,
        ownerPersonId,
        progress: 0,
        approvalRequired,
        approvalRule,
        approverPersonIds: approvalRequired ? approverPersonIds : undefined,
        approvalStatus: approvalRequired ? "NOT_REQUIRED" : "NOT_REQUIRED",
        dueDate: body?.dueDate ? new Date(body.dueDate) : null,
        createdByUserId: actor.userId,
        visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs) ? body.visibleOrgUnitRefs : undefined,
        visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? body.visibleRoleRefs : undefined,
        visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? body.visibleUserRefs : undefined,
        // Phase D: target group refs for resolved-member visibility
        visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs) ? body.visibleTargetGroupRefs : undefined,
        visibilityScope: Object.values(VisibilityScope).includes(body?.visibilityScope as VisibilityScope)
          ? (body.visibilityScope as VisibilityScope)
          : VisibilityScope.ORGANISATION,
        expectedOutcome: body?.expectedOutcome?.trim() || null,
        backlogPriority:
          typeof body?.backlogPriority === "number" && Number.isFinite(body.backlogPriority)
            ? Math.trunc(body.backlogPriority)
            : 0,
        disposition: Object.values(InitiativeDisposition).includes(body?.disposition as InitiativeDisposition)
          ? (body.disposition as InitiativeDisposition)
          : InitiativeDisposition.NONE,
      },
      select: { id: true, slug: true, title: true },
    });

    return NextResponse.json({ initiative: created }, { status: 201 });
  } catch (error) {
    console.error("Create initiative failed:", error);
    return NextResponse.json(
      { error: "Initiative konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
