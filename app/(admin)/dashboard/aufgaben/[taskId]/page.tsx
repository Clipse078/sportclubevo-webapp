/** DS2-07F governance marker: dedicated task page via DetailPagePattern (TaskWorkspace page mode). */
import { notFound } from "next/navigation";
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
    <TaskWorkspacePanel
      bundle={data.bundle}
      assigneeOptions={data.assigneeOptions}
      orgUnitOptions={data.orgUnitOptions}
      orgUnitDisplayLabel={data.orgUnitDisplayLabel}
      locale={data.locale}
      timeZone={data.timeZone}
      backHref={data.backHref}
      returnContextLabel={data.returnContextLabel}
      currentUserId={data.currentUserId}
      presentation="page"
    />
  );
}