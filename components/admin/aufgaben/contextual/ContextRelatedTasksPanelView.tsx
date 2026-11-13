"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { ContextRelatedTaskSummaryDto } from "@/lib/tasks/context-related-task-types";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/tasks/management-labels";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import type { TaskContextType } from "@prisma/client";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import ContextualTaskInlineCreateCard, {
  type ContextualTaskInlineCreateCardHandle,
} from "./ContextualTaskInlineCreateCard";
import { useTranslations } from "next-intl";

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
  contextType,
  contextId,
  actionableCount,
  tasks,
  hasMore,
  canCreate,
  createDialogProps,
  locale,
}: Props) {
  const tWork = useTranslations("PlanningEditor.operational.work");
  const [inlineCreateExpanded, setInlineCreateExpanded] = useState(false);
  const inlineCreateRef = useRef<ContextualTaskInlineCreateCardHandle>(null);
  const isMeetingContext = contextType === "MEETING";

  const openInlineCreate = useCallback(() => {
    setInlineCreateExpanded(true);
    window.requestAnimationFrame(() => {
      inlineCreateRef.current?.scrollIntoView();
      inlineCreateRef.current?.focusTitle();
    });
  }, []);

  useEffect(() => {
    if (!isMeetingContext || !canCreate) return;
    function handleOpen() {
      openInlineCreate();
    }
    window.addEventListener("meeting-open-inline-task-create", handleOpen);
    window.addEventListener("meeting-open-task-create-dialog", handleOpen);
    return () => {
      window.removeEventListener("meeting-open-inline-task-create", handleOpen);
      window.removeEventListener("meeting-open-task-create-dialog", handleOpen);
    };
  }, [canCreate, isMeetingContext, openInlineCreate]);

  return (
    <section
      id={isMeetingContext ? "meeting-section-aufgaben" : undefined}
      className={
        isMeetingContext
          ? "space-y-3"
          : "space-y-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4"
      }
      data-testid="context-related-tasks-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {isMeetingContext ? "Aufgaben" : `Aufgaben · ${actionableCount}`}
        </h3>
        {canCreate && createDialogProps ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[#0b4aa2] hover:bg-[var(--surface-2)]"
            onClick={() => {
              if (!inlineCreateExpanded) {
                openInlineCreate();
              } else {
                setInlineCreateExpanded(false);
              }
            }}
            aria-expanded={inlineCreateExpanded}
            aria-controls="context-related-task-inline-create-panel"
            data-testid="context-related-tasks-inline-toggle"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {tWork("createTask")}
          </button>
        ) : null}
      </div>

      {canCreate && createDialogProps ? (
        <ContextualTaskInlineCreateCard
          ref={inlineCreateRef}
          expanded={inlineCreateExpanded}
          onExpandedChange={setInlineCreateExpanded}
          panelDomId="context-related-task-inline-create-panel"
          {...createDialogProps}
        />
      ) : null}

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
