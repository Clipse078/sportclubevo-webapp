import type { PrismaClient } from "@prisma/client";
import type { RequirementAggregateDto } from "./types";

type AggregateClient = Pick<PrismaClient, "requirementRecipient">;

export function calculateRequirementResolvedPercent(
  resolvedCount: number,
  totalRecipients: number,
): number {
  if (totalRecipients === 0) return 0;
  return Math.round((resolvedCount / totalRecipients) * 100);
}

export async function computeRequirementAggregate(
  db: AggregateClient,
  tenantId: string,
  requirementId: string,
  now: Date = new Date(),
): Promise<RequirementAggregateDto> {
  const baseWhere = {
    tenantId,
    requirementId,
    removedAt: null,
  } as const;

  const [totalRecipients, openCount, resolvedCount, acknowledgedCount, overdueCount] =
    await Promise.all([
      db.requirementRecipient.count({ where: baseWhere }),
      db.requirementRecipient.count({
        where: { ...baseWhere, resolutionStatus: "OPEN" },
      }),
      db.requirementRecipient.count({
        where: { ...baseWhere, resolutionStatus: "RESOLVED" },
      }),
      db.requirementRecipient.count({
        where: { ...baseWhere, responseValue: "ACKNOWLEDGED" },
      }),
      db.requirementRecipient.count({
        where: {
          ...baseWhere,
          resolutionStatus: "OPEN",
          requirement: {
            status: "ACTIVE",
            dueAt: { lte: now },
          },
        },
      }),
    ]);

  const resolvedPercent = calculateRequirementResolvedPercent(resolvedCount, totalRecipients);

  return {
    totalRecipients,
    openCount,
    resolvedCount,
    acknowledgedCount,
    overdueCount,
    resolvedPercent,
  };
}

export { isRequirementRecipientOverdue } from "./requirement-deadlines";
