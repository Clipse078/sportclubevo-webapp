import { notFound } from "next/navigation";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";
import TaskSeriesWorkspace from "@/components/admin/aufgaben/TaskSeriesWorkspace";
import { loadTaskSeriesPageData } from "@/lib/tasks/task-series-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ seriesId: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export default async function TaskSeriesDetailPage({ params, searchParams }: Props) {
  const { seriesId } = await params;
  const sp = searchParams ? await searchParams : {};
  const occurrencePage = sp.page ? Number(sp.page) : 1;

  const data = await loadTaskSeriesPageData(
    seriesId,
    Number.isFinite(occurrencePage) ? occurrencePage : 1,
  );

  if (data.kind === "unauthorized" || data.kind === "not_found") {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <div className={cn(SCE_DIALOG_WORKSPACE_PANEL, "min-h-[70vh] w-full")}>
        <TaskSeriesWorkspace
          bundle={data.bundle}
          assigneeOptions={data.assigneeOptions}
          locale={data.locale}
          timeZone={data.timeZone}
          backHref={data.backHref}
        />
      </div>
    </div>
  );
}
