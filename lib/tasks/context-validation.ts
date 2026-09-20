import type { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
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

  const exists = await resolveContextExists(ctx.tenantId, type, id);
  if (!exists) {
    throw new TaskValidationError(
      "Context entity not found in this tenant or type mismatch",
    );
  }
}

async function resolveContextExists(
  tenantId: string,
  type: TaskContextType,
  id: string,
): Promise<boolean> {
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
    case "MEETING":
      return Boolean(
        await prisma.meeting.findFirst({
          where: { id, tenantId },
          select: { id: true },
        }),
      );
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
      return Boolean(
        await prisma.workspaceDocument.findFirst({
          where: { id, tenantId },
          select: { id: true },
        }),
      );
    default:
      return false;
  }
}
