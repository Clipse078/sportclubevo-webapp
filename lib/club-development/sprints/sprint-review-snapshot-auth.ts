import "server-only";

import type { TaskServiceContext } from "@/lib/tasks/types";
import { canReadTask } from "@/lib/tasks/visibility";
import { loadTaskForTenantAuth, taskAuthorizationFromRow } from "@/lib/tasks/task-access";
import type { SprintCloseSnapshot } from "./sprint-close-types";

export async function resolveAuthorizedCloseSnapshotTaskIds(
  taskCtx: TaskServiceContext,
  taskIds: readonly string[],
): Promise<Set<string>> {
  const unique = [...new Set(taskIds.filter(Boolean))];
  const authorized = new Set<string>();
  await Promise.all(
    unique.map(async (taskId) => {
      const row = await loadTaskForTenantAuth(taskCtx.tenantId, taskId);
      if (!row) return;
      if (canReadTask(taskCtx, taskAuthorizationFromRow(row))) {
        authorized.add(taskId);
      }
    }),
  );
  return authorized;
}

export function collectCloseSnapshotTaskIds(snapshot: SprintCloseSnapshot): string[] {
  return [
    ...snapshot.finishedTasks.map((t) => t.taskId),
    ...snapshot.unfinishedTasks.map((t) => t.taskId),
    ...snapshot.committedAtStartTaskIds,
    ...snapshot.addedAfterStartTaskIds,
  ];
}

export function filterCloseSnapshotForAuthorization(
  snapshot: SprintCloseSnapshot,
  authorizedTaskIds: Set<string>,
): SprintCloseSnapshot {
  const allow = (taskId: string) => authorizedTaskIds.has(taskId);
  return {
    ...snapshot,
    finishedTasks: snapshot.finishedTasks.filter((t) => allow(t.taskId)),
    unfinishedTasks: snapshot.unfinishedTasks.filter((t) => allow(t.taskId)),
    committedAtStartTaskIds: snapshot.committedAtStartTaskIds.filter(allow),
    addedAfterStartTaskIds: snapshot.addedAfterStartTaskIds.filter(allow),
  };
}