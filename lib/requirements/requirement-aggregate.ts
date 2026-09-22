import type { PrismaClient } from "@prisma/client";
import type { RequirementAggregateDto } from "./types";

type AggregateClient = Pick<PrismaClient, "requirementRecipient">;

export async function computeRequirementAggregate(
  db: AggregateClient,
  tenantId: string,
  requirementId: string,
): Promise<RequirementAggregateDto> {
  const baseWhere = {
    tenantId,
    requirementId,
    removedAt: null,
  } as const;

  const [totalRecipients, openCount, resolvedCount, acknowledgedCount] = await Promise.all([
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
  ]);

  const resolvedPercent =
    totalRecipients === 0 ? 0 : Math.round((resolvedCount / totalRecipients) * 100);

  return {
    totalRecipients,
    openCount,
    resolvedCount,
    acknowledgedCount,
    resolvedPercent,
  };
}

export { isRequirementRecipientOverdue } from "./requirement-deadlines";
