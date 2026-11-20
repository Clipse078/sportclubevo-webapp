/**
 * Tenant-scoped @mention candidates for Beschreibung fields (Strategie / Ziel / Aufgabe forms).
 * Mentions never grant access — eligibility is person identity search only.
 */

import {
  listEligiblePersonUserIdentitiesInTenant,
  searchEligiblePersonUserIdentitiesInTenant,
} from "@/lib/people/person-user-identity";
import type { TaskAssigneeOption } from "./queries";
import {
  TASK_MENTION_SEARCH_LIMIT,
  TASK_MENTION_SEARCH_MAX_DB_ROWS,
  TASK_MENTION_SEARCH_MIN_CHARS,
} from "./constants";

function mapIdentityRows(
  rows: Awaited<ReturnType<typeof searchEligiblePersonUserIdentitiesInTenant>>,
): TaskAssigneeOption[] {
  return rows.map((row) => ({
    personId: row.personId,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    displayName: row.displayName,
  }));
}

export async function searchTenantDescriptionMentionCandidates(
  tenantId: string,
  actorUserId: string,
  search: string,
  limit = TASK_MENTION_SEARCH_LIMIT,
): Promise<TaskAssigneeOption[]> {
  const term = search.trim();
  if (term.length > 0 && term.length < TASK_MENTION_SEARCH_MIN_CHARS) {
    return [];
  }

  const identityCandidates = term
    ? await searchEligiblePersonUserIdentitiesInTenant(
        tenantId,
        term,
        Math.max(limit * 4, TASK_MENTION_SEARCH_MAX_DB_ROWS),
      )
    : await listEligiblePersonUserIdentitiesInTenant(tenantId);

  return mapIdentityRows(identityCandidates)
    .filter((row) => row.userId !== actorUserId)
    .slice(0, limit);
}