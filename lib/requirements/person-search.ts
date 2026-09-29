import type { RequirementPersonOption } from "./person-search-types";
import {
  browseDiscoverableTenantPersons,
  searchDiscoverableTenantPersons,
} from "@/lib/people/tenant-person-discovery";
import { prisma } from "@/lib/db/prisma";

export type { RequirementPersonOption } from "./person-search-types";

export { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "./person-search-constants";

export async function browseRequirementAudiencePersons(
  tenantId: string,
  limit = 20,
  offset = 0,
): Promise<RequirementPersonOption[]> {
  const rows = await browseDiscoverableTenantPersons(tenantId, limit, offset);
  return rows.map((row) => ({
    personId: row.personId,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    email: row.email,
  }));
}

export async function searchRequirementAudiencePersons(
  tenantId: string,
  query: string,
  limit = 20,
  offset = 0,
): Promise<RequirementPersonOption[]> {
  const rows = await searchDiscoverableTenantPersons(tenantId, query, limit, offset);
  return rows.map((row) => ({
    personId: row.personId,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    email: row.email,
  }));
}

export async function loadRequirementPersonOptionsByIds(
  tenantId: string,
  personIds: readonly string[],
): Promise<RequirementPersonOption[]> {
  if (personIds.length === 0) return [];

  function formatDisplayName(row: {
    firstName: string;
    lastName: string;
    displayName: string | null;
  }): string {
    const fromParts = `${row.firstName} ${row.lastName}`.trim();
    return row.displayName?.trim() || fromParts || "Unbenannt";
  }

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
