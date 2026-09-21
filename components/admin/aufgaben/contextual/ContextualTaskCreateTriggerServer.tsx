import type { TaskContextType } from "@prisma/client";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";
import ContextualTaskCreateTrigger, {
  type ContextualTaskCreateTriggerVariant,
} from "./ContextualTaskCreateTrigger";

type Props = {
  contextType: TaskContextType;
  contextId: string;
  variant: ContextualTaskCreateTriggerVariant;
  locale?: string;
  timeZone?: string;
  className?: string;
  label?: string;
};

export default async function ContextualTaskCreateTriggerServer({
  contextType,
  contextId,
  variant,
  locale = "de-CH",
  timeZone = "Europe/Zurich",
  className,
  label,
}: Props) {
  const ctx = await getTaskServiceContext();
  if (!ctx) return null;

  const view = await loadContextualTaskCreateView(ctx, contextType, contextId, locale, timeZone);
  if (!view) return null;

  return (
    <ContextualTaskCreateTrigger
      variant={variant}
      className={className}
      label={label}
      contextType={view.contextType}
      contextId={view.contextId}
      presentation={view.presentation}
      assigneeOptions={view.assigneeOptions}
      orgUnitOptions={view.orgUnitOptions}
      timeZone={view.timeZone}
      tenantWideVisibility={view.tenantWideVisibility}
    />
  );
}
