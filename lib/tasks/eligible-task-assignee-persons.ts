/**
 * AUFGABEN-06G7R1 — Person-centric eligible task assignees (User resolved via linked Person).
 */

import {
  listEligiblePersonUserIdentitiesInTenant,
  resolvePersonUserIdentityByUserId,
  searchEligiblePersonUserIdentitiesInTenant,
} from "@/lib/people/person-user-identity";
import {
  ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT,
  ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS,
} from "./quick-create-assignee-search";
import type { TaskAssigneeOption } from "./queries";

function toTaskAssigneeOption(identity: {
  personId: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
}): TaskAssigneeOption {
  return {
    personId: identity.personId,
    userId: identity.userId,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    displayName: identity.displayName,
  };
}

export async function listEligibleTaskAssigneePersons(
  tenantId: string,
): Promise<TaskAssigneeOption[]> {
  const identities = await listEligiblePersonUserIdentitiesInTenant(tenantId);
  return identities.map(toTaskAssigneeOption);
}

export async function searchEligibleTaskAssigneePersons(
  tenantId: string,
  search: string,
  limit = ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT,
): Promise<TaskAssigneeOption[]> {
  const term = search.trim();
  if (term.length > 0 && term.length < ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS) {
    return [];
  }

  const identities = term
    ? await searchEligiblePersonUserIdentitiesInTenant(tenantId, term, limit)
    : await listEligiblePersonUserIdentitiesInTenant(tenantId);

  return identities.slice(0, limit).map(toTaskAssigneeOption);
}

export async function assertEligibleTaskAssigneeUserIds(
  tenantId: string,
  userIds: readonly string[],
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  const resolved = await Promise.all(
    unique.map((userId) => resolvePersonUserIdentityByUserId(tenantId, userId)),
  );

  if (resolved.some((row) => row == null)) {
    throw new Error("Assignee must be a linked Person with active tenant membership");
  }
}
