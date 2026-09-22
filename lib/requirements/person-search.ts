import { prisma } from "@/lib/db/prisma";

export type RequirementPersonOption = {
  personId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
};

import { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "./person-search-constants";

export { REQUIREMENT_PERSON_SEARCH_MIN_CHARS };

function formatDisplayName(row: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  const fromParts = `${row.firstName} ${row.lastName}`.trim();
  return row.displayName?.trim() || fromParts || "Unbenannt";
}

export async function searchRequirementAudiencePersons(
  tenantId: string,
  query: string,
  limit = 20,
): Promise<RequirementPersonOption[]> {
  const term = query.trim();
  if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) {
    return [];
  }

  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: limit,
  });

  return rows.map((row) => ({
    personId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: formatDisplayName(row),
    email: row.email,
  }));
}

export async function loadRequirementPersonOptionsByIds(
  tenantId: string,
  personIds: readonly string[],
): Promise<RequirementPersonOption[]> {
  if (personIds.length === 0) return [];
  const rows = await prisma.person.findMany({
    where: { tenantId, id: { in: [...personIds] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
    },
  });
  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        personId: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: formatDisplayName(row),
        email: row.email,
      } satisfies RequirementPersonOption,
    ]),
  );
  return personIds.map((id) => byId.get(id)).filter((v): v is RequirementPersonOption => !!v);
}

export async function loadRequirementPersonNameMap(
  tenantId: string,
  personIds: readonly string[],
): Promise<Map<string, string>> {
  const options = await loadRequirementPersonOptionsByIds(tenantId, personIds);
  return new Map(options.map((o) => [o.personId, o.displayName]));
}
