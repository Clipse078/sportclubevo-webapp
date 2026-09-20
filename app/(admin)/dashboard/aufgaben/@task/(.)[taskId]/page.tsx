import { notFound } from "next/navigation";
import TaskWorkspaceInterceptClient from "@/components/admin/aufgaben/TaskWorkspaceInterceptClient";
import { loadTaskWorkspacePageData } from "@/lib/tasks/task-workspace-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ taskId: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AufgabenTaskInterceptPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const sp = searchParams ? await searchParams : {};
  const data = await loadTaskWorkspacePageData(taskId, sp);

  if (data.kind === "unauthorized" || data.kind === "not_found") {
    notFound();
  }

  return (
    <TaskWorkspaceInterceptClient
      bundle={data.bundle}
      assigneeOptions={data.assigneeOptions}
      orgUnitOptions={data.orgUnitOptions}
      orgUnitDisplayLabel={data.orgUnitDisplayLabel}
      locale={data.locale}
      timeZone={data.timeZone}
      backHref={data.backHref}
      currentUserId={data.currentUserId}
    />
  );
}
