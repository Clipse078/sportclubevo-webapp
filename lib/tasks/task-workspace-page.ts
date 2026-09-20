import { auth } from "@/auth";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import {
  loadTaskOrgUnitMutationOptions,
  resolveTaskOrgUnitPresentationBatch,
} from "@/lib/tasks/task-org-options";
import { formatTaskOrgUnitListLabel } from "@/lib/tasks/management-labels";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { buildTaskManagementHref, resolveTaskManagementQuery } from "@/lib/tasks/management-navigation";
import { hasTaskPermission } from "@/lib/tasks/visibility";
import { loadTaskWorkspace } from "@/lib/tasks/workspace-service";
import { TaskForbiddenError, TaskNotFoundError } from "@/lib/tasks/errors";

export async function loadTaskWorkspacePageData(taskId: string, searchParams: Record<string, string | undefined>) {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const [ctx, session] = await Promise.all([getTaskServiceContext(), auth()]);
  const tenant = await getActiveTenant();
  const currentUserId = session?.user?.id;
  if (!ctx || !currentUserId) {
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
    const [bundle, assigneeOptions, orgUnitOptions] = await Promise.all([
      loadTaskWorkspace(ctx, taskId, locale, timeZone),
      listEligibleTaskAssignees(ctx.tenantId),
      loadTaskOrgUnitMutationOptions(ctx),
    ]);

    const orgPresentation = bundle.task.orgUnitId
      ? await resolveTaskOrgUnitPresentationBatch(ctx.tenantId, [bundle.task.orgUnitId])
      : new Map();
    const orgMeta = bundle.task.orgUnitId
      ? orgPresentation.get(bundle.task.orgUnitId)
      : null;
    const orgUnitDisplayLabel = formatTaskOrgUnitListLabel({
      orgUnitId: bundle.task.orgUnitId,
      orgUnitLabel: orgMeta
        ? orgMeta.archived
          ? `${orgMeta.label} · Archiviert`
          : orgMeta.label
        : null,
      visibilityScope: bundle.task.visibilityScope,
    });

    return {
      kind: "ok" as const,
      bundle,
      assigneeOptions,
      orgUnitOptions,
      orgUnitDisplayLabel,
      locale,
      timeZone,
      backHref,
      currentUserId,
    };
  } catch (error) {
    if (error instanceof TaskNotFoundError || error instanceof TaskForbiddenError) {
      return { kind: "not_found" as const };
    }
    throw error;
  }
}
