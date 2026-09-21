/**
 * AUFGABEN-06B — bounded mention candidate search (canReadTask-filtered).
 */

import { TaskVisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
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

function userSearchWhere(term: string) {
  if (term.length < TASK_MENTION_SEARCH_MIN_CHARS) return {};
  return {
    OR: [
      { firstName: { contains: term, mode: "insensitive" as const } },
      { lastName: { contains: term, mode: "insensitive" as const } },
      { email: { contains: term, mode: "insensitive" as const } },
    ],
  };
}

function mapMembershipRows(
  rows: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      isActive: boolean;
    };
  }>,
): TaskAssigneeOption[] {
  return rows
    .map((m) => m.user)
    .filter((u) => u.isActive)
    .map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    }));
}

const membershipUserSelect = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
    },
  },
} as const;

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
  const userFilter = userSearchWhere(term);

  if (task.visibilityScope === TaskVisibilityScope.ASSIGNEES_ONLY) {
    const candidateUserIds = directTaskParticipantUserIds(authRecord);
    if (candidateUserIds.length === 0) return [];

    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        userId: { in: candidateUserIds },
        user: { isActive: true, ...userFilter },
      },
      select: membershipUserSelect,
      orderBy: { user: { lastName: "asc" } },
      take: limit,
    });

    return mapMembershipRows(memberships).filter((row) => row.userId !== ctx.userId);
  }

  const batchSize = Math.max(limit * 3, limit);
  let skip = 0;
  const results: TaskAssigneeOption[] = [];
  const seenUserIds = new Set<string>();

  while (results.length < limit && skip < TASK_MENTION_SEARCH_MAX_DB_ROWS) {
    const take = Math.min(batchSize, TASK_MENTION_SEARCH_MAX_DB_ROWS - skip);
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        user: { isActive: true, ...userFilter },
      },
      select: membershipUserSelect,
      orderBy: { user: { lastName: "asc" } },
      take,
      skip,
    });

    skip += memberships.length;
    if (memberships.length === 0) break;

    const options = mapMembershipRows(memberships).filter((row) => row.userId !== ctx.userId);
    const fresh = options.filter((row) => !seenUserIds.has(row.userId));
    for (const row of fresh) {
      seenUserIds.add(row.userId);
    }
    if (fresh.length === 0) continue;

    const readableIds = await filterUserIdsWhoCanReadTask(
      ctx.tenantId,
      authRecord,
      fresh.map((o) => o.userId),
    );
    const readable = new Set(readableIds);

    for (const option of fresh) {
      if (readable.has(option.userId)) {
        results.push(option);
        if (results.length >= limit) break;
      }
    }
  }

  return results.slice(0, limit);
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
