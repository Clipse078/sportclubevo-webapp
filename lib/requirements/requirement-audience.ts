/**
 * Requirement draft audience resolution — explicit persons today; extensible for future selectors.
 */

import { prisma } from "@/lib/db/prisma";

function dedupePersonIds(personIds: readonly string[]): string[] {
  return [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
}

/**
 * Resolves draft audience to canonical subject Person ids before activation snapshot.
 * Current strategy: EXPLICIT_PERSONS via RequirementDraftAudiencePerson only.
 */
export async function resolveRequirementAudiencePersonIds(
  tenantId: string,
  requirementId: string,
): Promise<string[]> {
  const rows = await prisma.requirementDraftAudiencePerson.findMany({
    where: { tenantId, requirementId },
    select: { personId: true },
    orderBy: { personId: "asc" },
  });
  return dedupePersonIds(rows.map((row) => row.personId));
}

export function resolveRequirementAudiencePersonIdsFromDraftRows(
  draftAudience: ReadonlyArray<{ personId: string }>,
): string[] {
  return dedupePersonIds(draftAudience.map((entry) => entry.personId));
}
