import type { TaskContextType } from "@prisma/client";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadContextRelatedTasksPanel } from "@/lib/tasks/load-context-related-tasks-panel";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";
import ContextRelatedTasksPanelView from "./ContextRelatedTasksPanelView";

type Props = {
  contextType: TaskContextType;
  contextId: string;
  locale?: string;
  timeZone?: string;
};

export default async function ContextRelatedTasksPanel({
  contextType,
  contextId,
  locale = "de-CH",
  timeZone = "Europe/Zurich",
}: Props) {
  const ctx = await getTaskServiceContext();
  if (!ctx) return null;

  const panel = await loadContextRelatedTasksPanel(ctx, contextType, contextId);
  if (!panel) return null;

  const createView = panel.canCreate
    ? await loadContextualTaskCreateView(ctx, contextType, contextId, locale, timeZone)
    : null;

  const createDialogProps =
    createView && createView.canCreate
      ? {
          contextType: createView.contextType,
          contextId: createView.contextId,
          presentation: createView.presentation,
          assigneeOptions: createView.assigneeOptions,
          orgUnitOptions: createView.orgUnitOptions,
          timeZone: createView.timeZone,
          tenantWideVisibility: createView.tenantWideVisibility,
        }
      : null;

  return (
    <ContextRelatedTasksPanelView
      contextType={contextType}
      contextId={contextId}
      actionableCount={panel.actionableCount}
      tasks={panel.tasks}
      hasMore={panel.hasMore}
      canCreate={panel.canCreate}
      createDialogProps={createDialogProps}
      locale={locale}
    />
  );
}
