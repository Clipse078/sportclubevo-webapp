/**
 * AUFGABEN-06G7R1 — Person-centric eligible task assignees (User resolved via linked Person).
 */

import { prisma } from "@/lib/db/prisma";
import {
  ELIGIBLE_TASK_ASSIGNEE_SEARCH_LIMIT,
  ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS,
} from "./quick-create-assignee-search";
import type { TaskAssigneeOption } from "./queries";

function formatPersonDisplayName(row: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  const fromParts = `${row.firstName} ${row.lastName}`.trim();
  return row.displayName?.trim() || fromParts || "Unbenannt";
}

function mapPersonRow(row: {
  userId: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}): TaskAssigneeOption | null {
  if (!row.userId || !row.user) return null;
  const displayName = formatPersonDisplayName(row);
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.user.email || row.email || "",
    displayName,
  };
}

const personAssigneeSelect = {
  userId: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      tenantMemberships: {
        where: { isActive: true },
        select: { tenantId: true, isActive: true },
      },
    },
  },
} as const;

function personIsEligibleInTenant(
  row: {
    userId: string | null;
    user: {
      isActive: boolean;
      tenantMemberships: Array<{ tenantId: string; isActive: boolean }>;
    } | null;
  },
  tenantId: string,
): boolean {
  if (!row.userId || !row.user?.isActive) return false;
  return row.user.tenantMemberships.some((m) => m.tenantId === tenantId && m.isActive);
}

export async function listEligibleTaskAssigneePersons(
  tenantId: string,
): Promise<TaskAssigneeOption[]> {
  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      userId: { not: null },
      user: { isActive: true },
    },
    select: personAssigneeSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const byUserId = new Map<string, TaskAssigneeOption>();
  for (const row of rows) {
    if (!personIsEligibleInTenant(row, tenantId)) continue;
    const option = mapPersonRow(row);
    if (!option) continue;
    byUserId.set(option.userId, option);
  }
  return [...byUserId.values()];
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

  const rows = await prisma.person.findMany({
    where: {
      tenantId,
      userId: { not: null },
      user: { isActive: true },
      ...(term.length >= ELIGIBLE_TASK_ASSIGNEE_SEARCH_MIN_CHARS
        ? {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { displayName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              {
                user: {
                  email: { contains: term, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    select: personAssigneeSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: limit * 2,
  });

  const byUserId = new Map<string, TaskAssigneeOption>();
  for (const row of rows) {
    if (!personIsEligibleInTenant(row, tenantId)) continue;
    const option = mapPersonRow(row);
    if (!option) continue;
    byUserId.set(option.userId, option);
    if (byUserId.size >= limit) break;
  }
  return [...byUserId.values()];
}

export async function assertEligibleTaskAssigneeUserIds(
  tenantId: string,
  userIds: readonly string[],
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  const rows = await prisma.person.findMany({
    where: { tenantId, userId: { in: unique } },
    select: {
      userId: true,
      user: {
        select: {
          isActive: true,
          tenantMemberships: {
            where: { tenantId, isActive: true },
            select: { id: true },
          },
        },
      },
    },
  });

  const eligible = new Set(
    rows
      .filter(
        (row) =>
          row.userId &&
          row.user?.isActive &&
          (row.user?.tenantMemberships.length ?? 0) > 0,
      )
      .map((row) => row.userId!),
  );

  if (eligible.size !== unique.length) {
    throw new Error("Assignee must be a linked Person with active tenant membership");
  }
}
