import type { PlanningResourceType, TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * PLANNING-UX-05R1 — canonical planning resource identity for shared operational features.
 *
 * Mapping (aligned with Aufgaben TaskContextType registry):
 * - TRAINING     → TrainingSeries.id (not TrainingSession)
 * - MATCH        → Event.id (type=MATCH)
 * - TOURNAMENT   → Event.id (type=TOURNAMENT)
 * - CLUB_EVENT   → Event.id (type=OTHER)
 *
 * Collaboration comments use CommunicationTargetType with session id for TRAINING
 * (TrainingSession.id) — see resolvePlanningCollaborationTarget.
 */

export type PlanningResourceRef = {
  resourceType: PlanningResourceType;
  resourceId: string;
};

export function taskContextTypeToPlanningResourceType(
  contextType: TaskContextType,
): PlanningResourceType | null {
  switch (contextType) {
    case "TRAINING":
    case "MATCH":
    case "TOURNAMENT":
    case "CLUB_EVENT":
      return contextType;
    default:
      return null;
  }
}

export async function assertPlanningResourceExistsForTenant(
  tenantId: string,
  ref: PlanningResourceRef,
): Promise<void> {
  const id = ref.resourceId.trim();
  if (!id) {
    throw new Error("PLANNING_RESOURCE_ID_REQUIRED");
  }

  switch (ref.resourceType) {
    case "TRAINING": {
      const row = await prisma.trainingSeries.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });
      if (!row) throw new Error("PLANNING_RESOURCE_NOT_FOUND");
      return;
    }
    case "MATCH": {
      const row = await prisma.event.findFirst({
        where: { id, tenantId, type: "MATCH" },
        select: { id: true },
      });
      if (!row) throw new Error("PLANNING_RESOURCE_NOT_FOUND");
      return;
    }
    case "TOURNAMENT": {
      const row = await prisma.event.findFirst({
        where: { id, tenantId, type: "TOURNAMENT" },
        select: { id: true },
      });
      if (!row) throw new Error("PLANNING_RESOURCE_NOT_FOUND");
      return;
    }
    case "CLUB_EVENT": {
      const row = await prisma.event.findFirst({
        where: { id, tenantId, type: "OTHER" },
        select: { id: true },
      });
      if (!row) throw new Error("PLANNING_RESOURCE_NOT_FOUND");
      return;
    }
    default:
      throw new Error("PLANNING_RESOURCE_TYPE_UNSUPPORTED");
  }
}
