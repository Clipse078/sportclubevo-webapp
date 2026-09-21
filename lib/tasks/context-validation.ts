import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { loadOrgUnitIds, loadTargetGroupIds } from "@/lib/org/queries";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { canReadWorkspaceDocument } from "@/lib/workspace/document-access";
import { canAttachTaskContext } from "./context-access";
import { isSupportedTaskContextType } from "./context-registry";
import { TaskValidationError } from "./errors";
import type { TaskServiceContext } from "./types";

export async function validateTaskContext(
  ctx: TaskServiceContext,
  contextType: TaskContextType | null | undefined,
  contextId: string | null | undefined,
): Promise<void> {
  const type = contextType ?? null;
  const id = contextId?.trim() ?? null;

  if (!type && !id) return;

  if (type && !id) {
    throw new TaskValidationError("contextId is required when contextType is set");
  }
  if (!type && id) {
    throw new TaskValidationError("contextType is required when contextId is set");
  }
  if (!type || !id) return;

  if (!isSupportedTaskContextType(type)) {
    throw new TaskValidationError(`Unsupported task context type: ${type}`);
  }

  if (!canAttachTaskContext(ctx, type)) {
    throw new TaskValidationError(
      "Missing permission to link this operational context type",
    );
  }

  const attachable = await resolveContextAttachable(ctx, type, id);
  if (!attachable) {
    throw new TaskValidationError(
      "Context entity not found in this tenant or type mismatch",
    );
  }
}

async function buildMeetingActor(ctx: TaskServiceContext) {
  const [orgUnitIds, targetGroupIds] = await Promise.all([
    loadOrgUnitIds(ctx.userId, ctx.tenantId),
    loadTargetGroupIds(ctx.userId, ctx.tenantId),
  ]);
  return buildActorContext(
    { id: ctx.userId, roleKeys: [], permissionKeys: [...ctx.permissionKeys] },
    orgUnitIds,
    targetGroupIds,
    ctx.tenantId,
  );
}

async function resolveContextAttachable(
  ctx: TaskServiceContext,
  type: TaskContextType,
  id: string,
): Promise<boolean> {
  const tenantId = ctx.tenantId;
  switch (type) {
    case "MATCH":
      return Boolean(
        await prisma.event.findFirst({
          where: { id, tenantId, type: "MATCH" },
          select: { id: true },
        }),
      );
    case "TOURNAMENT":
      return Boolean(
        await prisma.event.findFirst({
          where: { id, tenantId, type: "TOURNAMENT" },
          select: { id: true },
        }),
      );
    case "CLUB_EVENT":
      return Boolean(
        await prisma.event.findFirst({
          where: { id, tenantId, type: "OTHER" },
          select: { id: true },
        }),
      );
    case "TRAINING":
      return Boolean(
        await prisma.trainingSeries.findFirst({
          where: { id, tenantId },
          select: { id: true },
        }),
      );
    case "MEETING": {
      const meeting = await prisma.meeting.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          visibilityScope: true,
          createdByUserId: true,
          visibleRoleRefs: true,
          visibleUserRefs: true,
          visibleTeamRefs: true,
          visibleOrgUnitRefs: true,
          visiblePersonRefs: true,
          visibleTargetGroupRefs: true,
        },
      });
      if (!meeting) return false;
      const actor = await buildMeetingActor(ctx);
      return canSeeMeeting(meeting, actor);
    }
    case "REGISTRATION":
      return Boolean(
        await prisma.registration.findFirst({
          where: { id, tenantId },
          select: { id: true },
        }),
      );
    case "TEAM":
      return Boolean(
        await prisma.team.findFirst({
          where: { id, tenantId },
          select: { id: true },
        }),
      );
    case "PERSON":
      return Boolean(
        await prisma.person.findFirst({
          where: { id, tenantId },
          select: { id: true },
        }),
      );
    case "DOCUMENT":
      return canReadWorkspaceDocument(ctx, id);
    default:
      return false;
  }
}
