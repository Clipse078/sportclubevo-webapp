import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { TaskForbiddenError, TaskNotFoundError } from "@/lib/tasks/errors";
import { loadTaskSeriesWorkspace } from "@/lib/tasks/series-workspace-service";
import { hasTaskPermission } from "@/lib/tasks/visibility";

export async function loadTaskSeriesPageData(seriesId: string, occurrencePage?: number) {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const ctx = await getTaskServiceContext();
  const tenant = await getActiveTenant();
  if (!ctx) {
    return { kind: "unauthorized" as const };
  }

  const locale = tenant?.locale ?? "de-CH";
  const timeZone = tenant?.timezone ?? "Europe/Zurich";
  const canManage = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  try {
    const [bundle, assigneeOptions] = await Promise.all([
      loadTaskSeriesWorkspace(ctx, seriesId, occurrencePage ?? 1),
      canManage ? listEligibleTaskAssignees(ctx.tenantId) : Promise.resolve([]),
    ]);

    return {
      kind: "ok" as const,
      bundle,
      assigneeOptions,
      locale,
      timeZone,
      backHref: "/dashboard/aufgaben?view=WIEDERKEHREND",
    };
  } catch (error) {
    if (error instanceof TaskNotFoundError || error instanceof TaskForbiddenError) {
      return { kind: "not_found" as const };
    }
    throw error;
  }
}

export async function loadTaskSeriesCreatePageData() {
  await requirePermission(PERMISSIONS.TASKS_MANAGE);

  const ctx = await getTaskServiceContext();
  const tenant = await getActiveTenant();
  if (!ctx) {
    return { kind: "unauthorized" as const };
  }

  const assigneeOptions = await listEligibleTaskAssignees(ctx.tenantId);
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  return {
    kind: "ok" as const,
    assigneeOptions,
    timeZone,
    backHref: "/dashboard/aufgaben?view=WIEDERKEHREND",
  };
}
