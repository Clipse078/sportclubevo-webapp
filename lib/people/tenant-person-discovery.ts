/**
 * Canonical tenant-scoped Person discovery for SCE selectors and requirements.
 * Answers: "Which people exist in this tenant?" (no task/requirement eligibility).
 */

import { prisma } from "@/lib/db/prisma";

export type DiscoverableTenantPerson = {
  personId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
};

function formatDisplayName(row: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  const fromParts = `${row.firstName} ${row.lastName}`.trim();
  return row.displayName?.trim() || fromParts || "Unbenannt";
}

function mapRow(row: {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string | null;
}): DiscoverableTenantPerson {
  return {
    personId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: formatDisplayName(row),
    email: row.email,
  };
}

const personListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
} as const;

export async function browseDiscoverableTenantPersons(
  tenantId: string,
  limit = 20,
  offset = 0,
): Promise<DiscoverableTenantPerson[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safeOffset = Math.max(offset, 0);

  const rows = await prisma.person.findMany({
    where: { tenantId, isActive: true },
    select: personListSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: safeOffset,
    take: safeLimit + 1,
  });

  return rows.map(mapRow);
}

export async function searchDiscoverableTenantPersons(
  tenantId: string,
  query: string,
  limit = 20,
  offset = 0,
): Promise<DiscoverableTenantPerson[]> {
  const term = query.trim();
  if (!term) {
    return browseDiscoverableTenantPersons(tenantId, limit, offset);
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safeOffset = Math.max(offset, 0);

  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    select: personListSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: safeOffset,
    take: safeLimit + 1,
  });

  return rows.map(mapRow);
}
