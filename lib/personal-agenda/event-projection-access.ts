import type { EventType, ReviewWorkflowStage } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export type PersonalEventProjectionActor = {
  userId: string;
  tenantId: string;
  permissionKeys: string[];
};

export type PersonalEventAuthorizationRow = {
  id: string;
  tenantId: string | null;
  teamId: string | null;
  type: EventType;
  status: string;
  reviewStage: ReviewWorkflowStage;
};

const VIEWABLE_REVIEW_STAGES = new Set<ReviewWorkflowStage>(["APPROVED", "PUBLISHED"]);

const HIDDEN_EVENT_STATUSES = new Set(["CANCELLED", "ARCHIVED"]);

function hasAnyPermission(actor: PersonalEventProjectionActor, keys: string[]): boolean {
  return keys.some((k) => actor.permissionKeys.includes(k));
}

/** Mirrors planner edit route module gates — view permission, not manage. */
export function canActorReadEventType(
  actor: PersonalEventProjectionActor,
  type: EventType,
): boolean {
  if (type === "TRAINING") {
    return hasAnyPermission(actor, [
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.TRAININGS_MANAGE,
      PERMISSIONS.EVENTS_VIEW,
      PERMISSIONS.EVENTS_MANAGE,
      PERMISSIONS.WOCHENPLAN_MANAGE,
    ]);
  }

  return hasAnyPermission(actor, [
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.WOCHENPLAN_MANAGE,
  ]);
}

function canActorBypassReviewStageGate(
  actor: PersonalEventProjectionActor,
  type: EventType,
): boolean {
  if (type === "TRAINING") {
    return hasAnyPermission(actor, [
      PERMISSIONS.TRAININGS_MANAGE,
      PERMISSIONS.EVENTS_MANAGE,
      PERMISSIONS.WOCHENPLAN_MANAGE,
    ]);
  }
  return hasAnyPermission(actor, [PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.WOCHENPLAN_MANAGE]);
}

export function canActorViewEventReviewStage(
  actor: PersonalEventProjectionActor,
  type: EventType,
  reviewStage: ReviewWorkflowStage,
): boolean {
  if (canActorBypassReviewStageGate(actor, type)) {
    return reviewStage !== "REJECTED";
  }
  return VIEWABLE_REVIEW_STAGES.has(reviewStage);
}

/**
 * Canonical personal programme event visibility (authorization layer).
 * Call only after personal team relevance is established for the row.
 */
export function canIncludeEventInPersonalProjection(
  actor: PersonalEventProjectionActor,
  event: PersonalEventAuthorizationRow,
): boolean {
  if (event.tenantId !== actor.tenantId) {
    return false;
  }
  if (HIDDEN_EVENT_STATUSES.has(event.status)) {
    return false;
  }
  if (!canActorReadEventType(actor, event.type)) {
    return false;
  }
  if (!canActorViewEventReviewStage(actor, event.type, event.reviewStage)) {
    return false;
  }
  return true;
}
