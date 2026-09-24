import type { CommunicationTargetType } from "@prisma/client";

export type PlanningCollaborationDomain = "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";

export type PlanningCollaborationTarget =
  | {
      supported: true;
      targetType: CommunicationTargetType;
      targetId: string;
    }
  | {
      supported: false;
      reason: "UNSUPPORTED_DOMAIN";
    };

export function resolvePlanningCollaborationTarget(
  domain: PlanningCollaborationDomain,
  resourceId: string,
): PlanningCollaborationTarget {
  const id = resourceId.trim();
  if (!id) {
    return { supported: false, reason: "UNSUPPORTED_DOMAIN" };
  }

  switch (domain) {
    case "TRAINING":
      return { supported: true, targetType: "TRAINING", targetId: id };
    case "MATCH":
      return { supported: true, targetType: "MATCH", targetId: id };
    case "TOURNAMENT":
      return { supported: true, targetType: "TOURNAMENT", targetId: id };
    case "CLUB_EVENT":
      return { supported: true, targetType: "CLUB_EVENT", targetId: id };
    default:
      return { supported: false, reason: "UNSUPPORTED_DOMAIN" };
  }
}
