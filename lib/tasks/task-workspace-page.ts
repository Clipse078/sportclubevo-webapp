import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { buildTaskManagementHref, resolveTaskManagementQuery } from "@/lib/tasks/management-navigation";
import { hasTaskPermission } from "@/lib/tasks/visibility";
import { loadTaskWorkspace } from "@/lib/tasks/workspace-service";
import { TaskForbiddenError, TaskNotFoundError } from "@/lib/tasks/errors";

export async function loadTaskWorkspacePageData(taskId: string, searchParams: Record<string, string | undefined>) {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const ctx = await getTaskServiceContext();
  const tenant = await getActiveTenant();
  if (!ctx) {
    return { kind: "unauthorized" as const };
  }

  const tenantWideVisibility =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW_ALL) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  const query = resolveTaskManagementQuery(searchParams, tenantWideVisibility);
  const backHref = buildTaskManagementHref("/dashboard/aufgaben", {}, query, {
    tenantWideVisibility,
  });

  const locale = tenant?.locale ?? "de-CH";
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  try {
    const [bundle, assigneeOptions] = await Promise.all([
      loadTaskWorkspace(ctx, taskId, locale, timeZone),
      listEligibleTaskAssignees(ctx.tenantId),
    ]);

    return {
      kind: "ok" as const,
      bundle,
      assigneeOptions,
      locale,
      timeZone,
      backHref,
    };
  } catch (error) {
    if (error instanceof TaskNotFoundError || error instanceof TaskForbiddenError) {
      return { kind: "not_found" as const };
    }
    throw error;
  }
}
