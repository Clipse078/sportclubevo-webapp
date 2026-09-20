import { ListChecks } from "lucide-react";
import { AufgabenProofPanel } from "@/components/admin/aufgaben/AufgabenProofPanel";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import {
  getTaskProgress,
  listSubtasks,
  listTasks,
} from "@/lib/tasks/task-service";
import { hasTaskPermission } from "@/lib/tasks/visibility";

export const dynamic = "force-dynamic";

export default async function AufgabenPage() {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const ctx = await getTaskServiceContext();
  const tenant = await getActiveTenant();
  if (!ctx) {
    return null;
  }

  const [tasks, assigneeOptions] = await Promise.all([
    listTasks(ctx, { rootsOnly: true }),
    listEligibleTaskAssignees(ctx.tenantId),
  ]);

  const enriched = await Promise.all(
    tasks.map(async (task) => ({
      task,
      subtasks: await listSubtasks(ctx, task.id),
      progress: await getTaskProgress(ctx, task.id),
    })),
  );

  const canCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  const canAssign =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
  const canManageSeries = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <ListChecks className="h-5 w-5" aria-hidden />
          <span className="text-xs uppercase tracking-wide">Operatives Modul</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Aufgaben</h1>
        <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">
          Funktionsprobe für Aufgaben, Subtasks und Serien (AUFGABEN-01/01B). Die
          Management-Oberfläche folgt in AUFGABEN-02.
        </p>
      </header>

      <AufgabenProofPanel
        taskTrees={enriched}
        assigneeOptions={assigneeOptions}
        tenantTimezone={tenant?.timezone ?? "Europe/Zurich"}
        canCreate={canCreate}
        canAssign={canAssign}
        canManageSeries={canManageSeries}
      />
    </div>
  );
}
