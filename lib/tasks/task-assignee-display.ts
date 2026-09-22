/**
 * AUFGABEN-06G7 — canonical Person-first display for task responsibility (User → linked Person).
 */

import { prisma } from "@/lib/db/prisma";
import { resolveAccountIdentityName } from "@/lib/people/identity";

export function formatTaskResponsibleDisplayName(input: {
  userFirstName: string;
  userLastName: string;
  linkedPerson?: { firstName?: string | null; lastName?: string | null } | null;
  tenantName?: string | null;
}): string {
  const resolved = resolveAccountIdentityName({
    linkedPerson: input.linkedPerson,
    sessionFirstName: input.userFirstName,
    sessionLastName: input.userLastName,
    tenantName: input.tenantName,
  });
  const full = `${resolved.firstName} ${resolved.lastName}`.trim();
  return full || "Unbekannt";
}

export function splitTaskResponsibleDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = displayName.trim();
  if (!trimmed) return { firstName: "Unbekannt", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space <= 0) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

export async function loadTaskResponsibleDisplayNamesByUserIds(
  tenantId: string,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const [tenant, memberships, persons] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.tenantMembership.findMany({
      where: { tenantId, userId: { in: unique }, isActive: true },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      },
    }),
    prisma.person.findMany({
      where: { tenantId, userId: { in: unique } },
      select: { userId: true, firstName: true, lastName: true },
    }),
  ]);

  const personByUserId = new Map(
    persons.filter((p) => p.userId).map((p) => [p.userId!, p]),
  );
  const tenantName = tenant?.name ?? null;
  const map = new Map<string, string>();

  for (const membership of memberships) {
    const user = membership.user;
    if (!user.isActive) continue;
    const linkedPerson = personByUserId.get(user.id);
    if (!linkedPerson) {
      map.set(user.id, TASK_LEGACY_ASSIGNEE_LABEL);
      continue;
    }
    map.set(
      user.id,
      formatTaskResponsibleDisplayName({
        userFirstName: user.firstName,
        userLastName: user.lastName,
        linkedPerson,
        tenantName,
      }),
    );
  }

  return map;
}

import { TASK_LEGACY_ASSIGNEE_LABEL } from "./task-creator-labels";
import type { TaskDto } from "./types";

export async function enrichTaskDtosWithResponsibleDisplayNames(
  tenantId: string,
  tasks: TaskDto[],
): Promise<TaskDto[]> {
  if (tasks.length === 0) return tasks;
  const userIds = tasks.flatMap((t) => t.assignees.map((a) => a.userId));
  const names = await loadTaskResponsibleDisplayNamesByUserIds(tenantId, userIds);

  return tasks.map((task) => ({
    ...task,
    assignees: task.assignees.map((assignee) => {
      const displayName = names.get(assignee.userId) ?? TASK_LEGACY_ASSIGNEE_LABEL;
      const parts = splitTaskResponsibleDisplayName(displayName);
      return {
        ...assignee,
        displayName,
        firstName: parts.firstName,
        lastName: parts.lastName,
      };
    }),
  }));
}

export async function enrichTaskAssigneeOptionsWithDisplayNames<
  T extends { userId: string; firstName: string; lastName: string },
>(tenantId: string, options: T[]): Promise<(T & { displayName: string })[]> {
  const names = await loadTaskResponsibleDisplayNamesByUserIds(
    tenantId,
    options.map((o) => o.userId),
  );
  return options.map((o) => ({
    ...o,
    displayName:
      names.get(o.userId) ??
      formatTaskResponsibleDisplayName({
        userFirstName: o.firstName,
        userLastName: o.lastName,
        linkedPerson: null,
        tenantName: null,
      }),
  }));
}
