/**
 * AUFGABEN-06B — bounded mention candidate search (canReadTask-filtered).
 */

import { TaskVisibilityScope } from "@prisma/client";
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
import { taskAuthorizationFromRow, type VisibleTaskRow } from "./task-access";
import type { TaskServiceContext } from "./types";
import {
  directTaskParticipantUserIds,
  filterUserIdsWhoCanReadTask,
  loadTaskServiceContextsForUsers,
} from "./task-mention-auth";
import { canReadTask } from "./task-authorization";

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

/** Documents worst-case DB scan bound for acceptance (CLUB / ORG_UNIT path). */
export function taskMentionSearchWorstCaseDbRowBound(): number {
  return TASK_MENTION_SEARCH_MAX_DB_ROWS;
}

export async function searchTaskMentionCandidates(
  ctx: TaskServiceContext,
  task: VisibleTaskRow,
  search: string,
  limit = TASK_MENTION_SEARCH_LIMIT,
): Promise<TaskAssigneeOption[]> {
  const term = search.trim();
  if (term.length > 0 && term.length < TASK_MENTION_SEARCH_MIN_CHARS) {
    return [];
  }

  const authRecord = taskAuthorizationFromRow(task);

  const identityCandidates = term
    ? await searchEligiblePersonUserIdentitiesInTenant(
        ctx.tenantId,
        term,
        Math.max(limit * 4, TASK_MENTION_SEARCH_MAX_DB_ROWS),
      )
    : await listEligiblePersonUserIdentitiesInTenant(ctx.tenantId);

  let options = mapIdentityRows(identityCandidates).filter((row) => row.userId !== ctx.userId);

  if (task.visibilityScope === TaskVisibilityScope.ASSIGNEES_ONLY) {
    const allowed = new Set(directTaskParticipantUserIds(authRecord));
    options = options.filter((row) => allowed.has(row.userId));
    return options.slice(0, limit);
  }

  const readableIds = await filterUserIdsWhoCanReadTask(
    ctx.tenantId,
    authRecord,
    options.map((o) => o.userId),
  );
  const readable = new Set(readableIds);

  const results: TaskAssigneeOption[] = [];
  for (const option of options) {
    if (!readable.has(option.userId)) continue;
    results.push(option);
    if (results.length >= limit) break;
  }

  return results;
}

/** Used in tests — documents CLUB vs assignee-only eligibility split. */
export function userCanBeMentionCandidate(
  userCtx: TaskServiceContext,
  task: VisibleTaskRow,
): boolean {
  return canReadTask(userCtx, taskAuthorizationFromRow(task));
}

export async function preloadMentionSearchContext(
  tenantId: string,
  userIds: string[],
): Promise<void> {
  await loadTaskServiceContextsForUsers(tenantId, userIds);
}
