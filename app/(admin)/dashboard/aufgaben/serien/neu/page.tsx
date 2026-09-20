import { notFound } from "next/navigation";
import TaskSeriesCreateClient from "@/components/admin/aufgaben/TaskSeriesCreateClient";
import { loadTaskSeriesCreatePageData } from "@/lib/tasks/task-series-page";

export const dynamic = "force-dynamic";

export default async function TaskSeriesCreatePage() {
  const data = await loadTaskSeriesCreatePageData();
  if (data.kind === "unauthorized") {
    notFound();
  }

  return (
    <TaskSeriesCreateClient
      assigneeOptions={data.assigneeOptions}
      timeZone={data.timeZone}
      backHref={data.backHref}
    />
  );
}
