import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import {
  ClubDevelopmentProcessStatus,
  MeetingApprovalRule,
  VisibilityScope,
} from "@prisma/client";
import { getClubDevelopmentProcesses } from "@/lib/club-development/process-queries";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";
import { parseApproverPersonIds, validateApprovalConfig } from "@/lib/meetings/meeting-approval-presentation";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const processes = await getClubDevelopmentProcesses(access.context.actor);
  return NextResponse.json({ processes });
}

export async function POST(req: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => ({}));
  const { actor, tenantId } = access.context;

  const title = (body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  const slug =
    (body?.slug ?? "").trim() ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const collision = await prisma.clubDevelopmentProcess.findFirst({
    where: { tenantId, slug },
    select: { id: true },
  });
  if (collision) {
    return NextResponse.json({ error: `Slug "${slug}" ist bereits vergeben.` }, { status: 409 });
  }

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
  const approvalRule: MeetingApprovalRule = Object.values(MeetingApprovalRule).includes(
    body?.approvalRule,
  )
    ? body.approvalRule
    : MeetingApprovalRule.ALL;
  const approverPersonIds = Array.isArray(body?.approverPersonIds)
    ? parseApproverPersonIds(body.approverPersonIds)
    : [];
  const approvalValidation = validateApprovalConfig({ approvalRequired, approverPersonIds });
  if (approvalValidation) {
    return NextResponse.json({ error: approvalValidation }, { status: 400 });
  }

  const validStatuses = Object.values(ClubDevelopmentProcessStatus);
  const status = validStatuses.includes(body?.status as ClubDevelopmentProcessStatus)
    ? (body.status as ClubDevelopmentProcessStatus)
    : ClubDevelopmentProcessStatus.DRAFT;

  const visibilityScope = Object.values(VisibilityScope).includes(body?.visibilityScope)
    ? body.visibilityScope
    : VisibilityScope.ORGANISATION;

  const created = await prisma.clubDevelopmentProcess.create({
    data: {
      tenantId,
      slug,
      title,
      summary: body?.summary?.trim() || null,
      description: body?.description?.trim() || null,
      status,
      owner,
      ownerPersonId,
      approvalRequired,
      approvalRule,
      approverPersonIds: approvalRequired ? approverPersonIds : undefined,
      approvalStatus: approvalRequired ? "NOT_REQUIRED" : "NOT_REQUIRED",
      visibilityScope,
      createdByUserId: actor.userId,
      visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs) ? body.visibleOrgUnitRefs : undefined,
      visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? body.visibleRoleRefs : undefined,
      visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? body.visibleUserRefs : undefined,
      visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs)
        ? body.visibleTargetGroupRefs
        : undefined,
    },
    select: { id: true, slug: true, title: true },
  });
  return NextResponse.json({ process: created }, { status: 201 });
}
