import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { buildTaskManagementHref, resolveTaskManagementQuery } from "@/lib/tasks/management-navigation";
import { canViewAllTasks } from "@/lib/tasks/visibility";
import AufgabenFullCreateClient from "@/components/admin/aufgaben/AufgabenFullCreateClient";

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

  const assigneeOptions = await listEligibleTaskAssignees(ctx.tenantId);

  return <AufgabenFullCreateClient assigneeOptions={assigneeOptions} backHref={backHref} />;
}
