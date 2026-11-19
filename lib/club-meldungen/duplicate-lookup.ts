import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canViewMeldung, type ClubMeldungAccessContext } from "@/lib/club-meldungen/access";

export type ClubMeldungDuplicateLookupResult = {
  id: string;
  caseNumber: string;
  subject: string;
};

export async function searchClubMeldungenForDuplicateLink(input: {
  tenantId: string;
  query: string;
  excludeMeldungId: string;
  access: ClubMeldungAccessContext;
  limit?: number;
}): Promise<ClubMeldungDuplicateLookupResult[]> {
  const trimmed = input.query.trim();
  if (trimmed.length < 2) return [];

  const where: Prisma.ClubMeldungWhereInput = {
    tenantId: input.tenantId,
    id: { not: input.excludeMeldungId },
    OR: [
      { caseNumber: { contains: trimmed, mode: "insensitive" } },
      { subject: { contains: trimmed, mode: "insensitive" } },
    ],
  };

  const rows = await prisma.clubMeldung.findMany({
    where,
    orderBy: { lastActivityAt: "desc" },
    take: Math.min(input.limit ?? 8, 20),
    select: {
      id: true,
      caseNumber: true,
      subject: true,
      reporterUserId: true,
      accountableUserId: true,
      collaborators: { select: { userId: true } },
    },
  });

  const visible: ClubMeldungDuplicateLookupResult[] = [];
  for (const row of rows) {
    const collaboratorUserIds = row.collaborators.map((entry) => entry.userId);
    if (
      !canViewMeldung(
        {
          reporterUserId: row.reporterUserId,
          accountableUserId: row.accountableUserId,
        },
        {
          ...input.access,
          collaboratorUserIds,
        },
      )
    ) {
      continue;
    }
    visible.push({
      id: row.id,
      caseNumber: row.caseNumber,
      subject: row.subject,
    });
    if (visible.length >= (input.limit ?? 8)) break;
  }
  return visible;
}