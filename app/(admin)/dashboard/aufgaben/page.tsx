import { ListChecks } from "lucide-react";
import { AufgabenProofPanel } from "@/components/admin/aufgaben/AufgabenProofPanel";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { listTasks } from "@/lib/tasks/task-service";
import { hasTaskPermission } from "@/lib/tasks/visibility";

export const dynamic = "force-dynamic";

export default async function AufgabenPage() {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return null;
  }

  const [tasks, assigneeOptions] = await Promise.all([
    listTasks(ctx),
    listEligibleTaskAssignees(ctx.tenantId),
  ]);

  const canCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  const canAssign =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <ListChecks className="h-5 w-5" aria-hidden />
          <span className="text-xs uppercase tracking-wide">Operatives Modul</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Aufgaben</h1>
        <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">
          Minimale Funktionsprobe für die kanonische Aufgabenbasis (AUFGABEN-01). Die
          Management-Oberfläche folgt in AUFGABEN-02.
        </p>
      </header>

      <AufgabenProofPanel
        tasks={tasks}
        assigneeOptions={assigneeOptions}
        canCreate={canCreate}
        canAssign={canAssign}
      />
    </div>
  );
}
