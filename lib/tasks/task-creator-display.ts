/**
 * AUFGABEN-06G7R1 — Person-first creator / actor display for tasks and requirements.
 */

import { prisma } from "@/lib/db/prisma";
import { formatTaskResponsibleDisplayName } from "./task-assignee-display";
import {
  TASK_CREATOR_UNAVAILABLE_LABEL,
  TASK_LEGACY_ASSIGNEE_LABEL,
} from "./task-creator-labels";

export { TASK_CREATOR_UNAVAILABLE_LABEL, TASK_LEGACY_ASSIGNEE_LABEL };

export async function resolveTaskCreatorDisplayNamesByUserIds(
  tenantId: string,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const [tenant, persons] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.person.findMany({
      where: { tenantId, userId: { in: unique } },
      select: { userId: true, firstName: true, lastName: true, displayName: true },
    }),
  ]);

  const personByUserId = new Map(
    persons.filter((p) => p.userId).map((p) => [p.userId!, p]),
  );
  const tenantName = tenant?.name ?? null;
  const map = new Map<string, string>();

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, lastName: true },
  });

  for (const user of users) {
    const linked = personByUserId.get(user.id);
    if (linked) {
      const display =
        linked.displayName?.trim() ||
        `${linked.firstName} ${linked.lastName}`.trim();
      if (display) {
        map.set(user.id, display);
        continue;
      }
    }
    const fallback = formatTaskResponsibleDisplayName({
      userFirstName: user.firstName,
      userLastName: user.lastName,
      linkedPerson: linked,
      tenantName,
    });
    map.set(
      user.id,
      linked ? fallback || TASK_CREATOR_UNAVAILABLE_LABEL : TASK_LEGACY_ASSIGNEE_LABEL,
    );
  }

  return map;
}

export function formatTaskCreatorDisplayName(
  createdByUserId: string | null | undefined,
  resolvedNames: Map<string, string>,
): string {
  if (!createdByUserId) return TASK_CREATOR_UNAVAILABLE_LABEL;
  return resolvedNames.get(createdByUserId) ?? TASK_CREATOR_UNAVAILABLE_LABEL;
}
