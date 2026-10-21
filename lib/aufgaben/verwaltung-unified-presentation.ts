import type { TaskManagementListItem } from "@/lib/tasks/management-service";
import type { RequirementManagementListItem } from "@/lib/requirements/management-service";
import {
  formatRequirementConfirmationAggregateLabel,
  formatRequirementRecipientCountLabel,
  REQUIREMENT_STATUS_LABELS,
} from "@/lib/requirements/presentation";
import { taskStatusPresentation } from "@/lib/tasks/management-presentation";
import { formatAssigneeName } from "@/lib/tasks/management-labels";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";

export type VerwaltungUnifiedRow =
  | {
      kind: "AUFGABE";
      id: string;
      title: string;
      href: string;
      statusLabel: string;
      metaPrimary: string;
      metaSecondary: string | null;
      sortKey: number;
    }
  | {
      kind: "ANFORDERUNG";
      id: string;
      title: string;
      href: string;
      statusLabel: string;
      metaPrimary: string;
      metaSecondary: string | null;
      sortKey: number;
    };

function taskDueSortKey(iso: string | null): number {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

export function buildVerwaltungUnifiedRows(input: {
  tasks: TaskManagementListItem[];
  requirements: RequirementManagementListItem[];
  locale: string;
  timeZone: string;
  taskHref: (taskId: string) => string;
  requirementHref: (requirementId: string) => string;
}): VerwaltungUnifiedRow[] {
  const taskRows: VerwaltungUnifiedRow[] = input.tasks.map((item) => {
    const task = item.task;
    const assignee = task.assignees[0];
    const assigneeLabel = assignee
      ? formatAssigneeName(assignee.firstName, assignee.lastName, assignee.displayName)
      : "—";
    const deadline = presentTaskDeadline({
      dueAt: task.dueAt,
      locale: input.locale,
      timeZone: input.timeZone,
      status: task.status,
    });
    return {
      kind: "AUFGABE",
      id: task.id,
      title: task.title,
      href: input.taskHref(task.id),
      statusLabel: taskStatusPresentation(task.status).label,
      metaPrimary: assigneeLabel,
      metaSecondary: deadline.label || null,
      sortKey: taskDueSortKey(task.dueAt),
    };
  });

  const requirementRows: VerwaltungUnifiedRow[] = input.requirements.map((item) => {
    const req = item.requirement;
    const aggregateLabel = formatRequirementConfirmationAggregateLabel(item.aggregate, req.status);
    const recipientLabel = formatRequirementRecipientCountLabel(
      item.aggregate,
      req.draftAudiencePersonIds.length,
      req.status,
    );
    return {
      kind: "ANFORDERUNG",
      id: req.id,
      title: req.title,
      href: input.requirementHref(req.id),
      statusLabel: REQUIREMENT_STATUS_LABELS[req.status],
      metaPrimary: aggregateLabel ?? recipientLabel,
      metaSecondary: aggregateLabel ? recipientLabel : null,
      sortKey: taskDueSortKey(req.dueAt),
    };
  });

  return [...taskRows, ...requirementRows].sort((a, b) => a.sortKey - b.sortKey);
}
