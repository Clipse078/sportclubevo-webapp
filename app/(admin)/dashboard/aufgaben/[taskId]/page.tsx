import { notFound } from "next/navigation";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";
import { TaskWorkspacePanel } from "@/components/admin/aufgaben/TaskWorkspace";
import { loadTaskWorkspacePageData } from "@/lib/tasks/task-workspace-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ taskId: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AufgabenTaskDetailPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const sp = searchParams ? await searchParams : {};
  const data = await loadTaskWorkspacePageData(taskId, sp);

  if (data.kind === "unauthorized" || data.kind === "not_found") {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <div className={cn(SCE_DIALOG_WORKSPACE_PANEL, "min-h-[70vh] w-full")}>
        <TaskWorkspacePanel
          bundle={data.bundle}
          assigneeOptions={data.assigneeOptions}
          orgUnitOptions={data.orgUnitOptions}
          orgUnitDisplayLabel={data.orgUnitDisplayLabel}
          locale={data.locale}
          timeZone={data.timeZone}
          backHref={data.backHref}
          presentation="page"
        />
      </div>
    </div>
  );
}
