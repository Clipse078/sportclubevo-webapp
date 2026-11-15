import "server-only";

import { prisma } from "@/lib/db/prisma";
import { loadTaskResponsibleDisplayNamesByUserIds } from "@/lib/tasks/task-assignee-display";

export type SprintTaskAssigneeViewModel = {
  userId: string;
  displayName: string;
  imageUrl: string | null;
};

export async function loadSprintTaskAssigneeViewModels(
  tenantId: string,
  userIds: readonly string[],
): Promise<SprintTaskAssigneeViewModel[]> {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const id of userIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  if (ordered.length === 0) return [];

  const [names, persons] = await Promise.all([
    loadTaskResponsibleDisplayNamesByUserIds(tenantId, ordered),
    prisma.person.findMany({
      where: { tenantId, userId: { in: ordered } },
      select: { userId: true, imageUrl: true },
    }),
  ]);

  const imageByUserId = new Map(
    persons.filter((p) => p.userId).map((p) => [p.userId!, p.imageUrl ?? null]),
  );

  return ordered.map((userId) => ({
      userId,
      displayName: names.get(userId) ?? "Unbekannt",
      imageUrl: imageByUserId.get(userId) ?? null,
    }));
}

export async function mapTaskAssigneeRowsToViewModels(
  tenantId: string,
  rows: readonly { userId: string }[],
): Promise<SprintTaskAssigneeViewModel[]> {
  return loadSprintTaskAssigneeViewModels(
    tenantId,
    rows.map((r) => r.userId),
  );
}