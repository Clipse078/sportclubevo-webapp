import type { Prisma } from "@prisma/client";

/** Published club events exposed on member/public programme surfaces. */
export const CLUB_EVENT_PUBLISHED_REVIEW_STAGES = ["APPROVED", "PUBLISHED"] as const;

export function clubEventPublishedVisibilityWhere(): Prisma.EventWhereInput {
  return {
    type: "OTHER",
    status: { not: "ARCHIVED" },
    reviewStage: { in: [...CLUB_EVENT_PUBLISHED_REVIEW_STAGES] },
  };
}

export function clubEventManagementVisibilityWhere(
  includeWorkflow = true,
): Prisma.EventWhereInput {
  if (!includeWorkflow) {
    return clubEventPublishedVisibilityWhere();
  }
  return {
    type: "OTHER",
    status: { not: "ARCHIVED" },
    reviewStage: {
      in: ["DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED", "REJECTED"],
    },
  };
}
