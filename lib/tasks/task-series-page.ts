import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { loadTaskOrgUnitMutationOptions } from "@/lib/tasks/task-org-options";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { TaskForbiddenError, TaskNotFoundError } from "@/lib/tasks/errors";
import { loadTaskSeriesWorkspace } from "@/lib/tasks/series-workspace-service";
export async function loadTaskSeriesPageData(seriesId: string, occurrencePage?: number) {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const ctx = await getTaskServiceContext();
  const tenant = await getActiveTenant();
  if (!ctx) {
    return { kind: "unauthorized" as const };
  }

  const locale = tenant?.locale ?? "de-CH";
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  try {
    const bundle = await loadTaskSeriesWorkspace(ctx, seriesId, occurrencePage ?? 1);
    const [assigneeOptions, orgUnitOptions] = await Promise.all([
      bundle.canManage
        ? listEligibleTaskAssignees(ctx.tenantId)
        : Promise.resolve([]),
      loadTaskOrgUnitMutationOptions(ctx),
    ]);

    return {
      kind: "ok" as const,
      bundle,
      assigneeOptions,
      orgUnitOptions,
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

  const [assigneeOptions, orgUnitOptions] = await Promise.all([
    listEligibleTaskAssignees(ctx.tenantId),
    loadTaskOrgUnitMutationOptions(ctx),
  ]);
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  return {
    kind: "ok" as const,
    assigneeOptions,
    orgUnitOptions,
    timeZone,
    backHref: "/dashboard/aufgaben?view=WIEDERKEHREND",
  };
}
