import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { loadTaskOrgUnitMutationOptions } from "@/lib/tasks/task-org-options";
import { buildTaskManagementHref, resolveTaskManagementQuery } from "@/lib/tasks/management-navigation";
import { canViewAllTasks } from "@/lib/tasks/visibility";
import type { TaskContextType } from "@prisma/client";
import AufgabenFullCreateClient from "@/components/admin/aufgaben/AufgabenFullCreateClient";
import { isSupportedTaskContextType } from "@/lib/tasks/context-registry";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AufgabenCreatePage({ searchParams }: Props) {
  await requirePermission(PERMISSIONS.TASKS_CREATE);

  const ctx = await getTaskServiceContext();
  if (!ctx) return null;

  const sp = searchParams ? await searchParams : {};
  const tenantWideVisibility = canViewAllTasks(ctx);
  const query = resolveTaskManagementQuery(sp, tenantWideVisibility);
  const backHref = buildTaskManagementHref("/dashboard/aufgaben", {}, query, {
    tenantWideVisibility,
  });

  const [assigneeOptions, orgUnitOptions] = await Promise.all([
    listEligibleTaskAssignees(ctx.tenantId),
    loadTaskOrgUnitMutationOptions(ctx),
  ]);

  const contextTypeRaw = sp.contextType?.trim() ?? "";
  const contextIdRaw = sp.contextId?.trim() ?? "";
  const initialContextType = isSupportedTaskContextType(contextTypeRaw as TaskContextType)
    ? (contextTypeRaw as TaskContextType)
    : null;
  const initialContextId =
    initialContextType && contextIdRaw ? contextIdRaw : null;

  return (
    <AufgabenFullCreateClient
      assigneeOptions={assigneeOptions}
      orgUnitOptions={orgUnitOptions}
      backHref={backHref}
      initialContextType={initialContextType}
      initialContextId={initialContextId}
    />
  );
}
