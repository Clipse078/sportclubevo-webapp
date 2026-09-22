"use client";

import Link from "next/link";
import type { ContextRelatedTaskSummaryDto } from "@/lib/tasks/context-related-task-types";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/tasks/management-labels";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import type { TaskContextType } from "@prisma/client";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import ContextualTaskCreateTrigger from "./ContextualTaskCreateTrigger";

type CreateProps = Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange">;

type Props = {
  contextType: TaskContextType;
  contextId: string;
  actionableCount: number;
  tasks: ContextRelatedTaskSummaryDto[];
  hasMore: boolean;
  canCreate: boolean;
  createDialogProps: CreateProps | null;
  locale: string;
};

function formatDue(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function assigneeLabel(
  assignees: ContextRelatedTaskSummaryDto["assignees"],
): string {
  if (!assignees.length) return "—";
  const first = assignees[0];
  const name = `${first.firstName} ${first.lastName}`.trim();
  if (assignees.length === 1) return name;
  return `${name} +${assignees.length - 1}`;
}

export default function ContextRelatedTasksPanelView({
  actionableCount,
  tasks,
  hasMore,
  canCreate,
  createDialogProps,
  locale,
}: Props) {
  return (
    <section
      className="space-y-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4"
      data-testid="context-related-tasks-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Aufgaben · {actionableCount}
        </h3>
        {canCreate && createDialogProps ? (
          <ContextualTaskCreateTrigger
            variant="button"
            label="+ Aufgabe"
            className="!min-h-8 !px-2.5 !py-1 text-xs"
            {...createDialogProps}
          />
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <div className="py-2 text-sm text-[var(--text-2)]" data-testid="context-related-tasks-empty">
          <p>Noch keine offenen Aufgaben</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]/60" data-testid="context-related-tasks-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={taskWorkspaceHref(task.id)}
                className="flex flex-col gap-1 py-2.5 text-sm transition hover:bg-[var(--surface-2)]/40 -mx-2 px-2 rounded-lg"
                data-testid="context-related-task-row"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-[var(--foreground)] truncate">
                    {task.title}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-[var(--text-2)]">
                  <span>{assigneeLabel(task.assignees)}</span>
                  <span>Fällig {formatDue(task.dueAt, locale)}</span>
                  <span>{TASK_PRIORITY_LABELS[task.priority]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <p className="text-xs text-[var(--muted)]" data-testid="context-related-tasks-truncated">
          Weitere Aufgaben im Aufgaben-Center sichtbar, wenn berechtigt.
        </p>
      ) : null}
    </section>
  );
}
