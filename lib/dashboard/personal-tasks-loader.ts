/**
 * Dashboard personal Aufgaben — canonical RBAC + bounded task preview.
 *
 * Uses the same live effective-permission resolution as requirePermission /
 * getTaskServiceContext (not session JWT snapshots or legacy availability stubs).
 */

import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { countMyOpenTasks, listMyTasks } from "@/lib/tasks/task-service";
import type { TaskServiceContext } from "@/lib/tasks/types";

export const DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT = 5;

export type DashboardPersonalTaskPreviewItem = {
  id: string;
  title: string;
  dueAt: string | null;
  parentTitle: string | null;
};

export type DashboardPersonalTasksSnapshot = {
  /** User holds tasks.view in the active tenant. */
  authorized: boolean;
  /** Personal open/actionable count; null when unauthorized. */
  count: number | null;
  preview: DashboardPersonalTaskPreviewItem[];
};

export async function loadDashboardPersonalTasks(args: {
  tenantId: string;
  userId: string;
}): Promise<DashboardPersonalTasksSnapshot> {
  const { platform, tenant } = await getRequestEffectivePermissions(
    args.userId,
    args.tenantId,
  );
  const permissionKeys = [...platform, ...tenant];

  if (!permissionKeys.includes(PERMISSIONS.TASKS_VIEW)) {
    return { authorized: false, count: null, preview: [] };
  }

  const ctx: TaskServiceContext = {
    tenantId: args.tenantId,
    userId: args.userId,
    permissionKeys,
  };

  const [count, previewTasks] = await Promise.all([
    countMyOpenTasks(ctx),
    listMyTasks(ctx, {
      openOnly: true,
      limit: DASHBOARD_PERSONAL_TASK_PREVIEW_LIMIT,
    }),
  ]);

  return {
    authorized: true,
    count,
    preview: previewTasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      parentTitle: task.parentTask?.title ?? null,
    })),
  };
}
