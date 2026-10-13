import type { Prisma } from "@prisma/client";

/** Operational planning stages exposed on participant/programme surfaces. */
export const TRAINING_PUBLISHED_PLANNING_STAGES = ["APPROVED"] as const;

export function trainingSeriesPublishedVisibilityWhere(): Prisma.TrainingSeriesWhereInput {
  return {
    archivedAt: null,
    status: { in: ["ACTIVE", "INACTIVE"] },
    planningStage: { in: [...TRAINING_PUBLISHED_PLANNING_STAGES] },
  };
}
