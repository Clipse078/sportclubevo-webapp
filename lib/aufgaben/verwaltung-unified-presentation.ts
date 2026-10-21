import type { TaskManagementListItem } from "@/lib/tasks/management-service";
import type { RequirementManagementListItem } from "@/lib/requirements/management-service";
import {
  resolveTaskManagementQuery,
  type TaskManagementQueryState,
  type TaskManagementView,
} from "@/lib/tasks/management-navigation";
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

const UNIFIED_OVERVIEW_EXCLUDED_VIEWS = new Set<TaskManagementView>(["WIEDERKEHREND", "ERLEDIGT"]);

/**
 * Verwaltung «Alle» composes a flat task overview — not series or completed-only views.
 */
export function resolveVerwaltungUnifiedOverviewTaskQuery(
  params: Record<string, string | undefined>,
  tenantWideVisibility: boolean,
): TaskManagementQueryState {
  const query = resolveTaskManagementQuery(params, tenantWideVisibility);
  if (!UNIFIED_OVERVIEW_EXCLUDED_VIEWS.has(query.view)) {
    return query;
  }
  const overviewView: TaskManagementView = tenantWideVisibility ? "ALLE" : "MEINE";
  return { ...query, view: overviewView, page: 1 };
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
    const assignees = task.assignees ?? [];
    const assignee = assignees[0];
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
    const draftAudienceCount = req.draftAudiencePersonIds?.length ?? 0;
    const aggregateLabel = formatRequirementConfirmationAggregateLabel(item.aggregate, req.status);
    const recipientLabel = formatRequirementRecipientCountLabel(
      item.aggregate,
      draftAudienceCount,
      req.status,
    );
    const statusLabel = REQUIREMENT_STATUS_LABELS[req.status] ?? req.status;
    return {
      kind: "ANFORDERUNG",
      id: req.id,
      title: req.title,
      href: input.requirementHref(req.id),
      statusLabel,
      metaPrimary: aggregateLabel ?? recipientLabel,
      metaSecondary: aggregateLabel ? recipientLabel : null,
      sortKey: taskDueSortKey(req.dueAt),
    };
  });

  return [...taskRows, ...requirementRows].sort((a, b) => a.sortKey - b.sortKey);
}
