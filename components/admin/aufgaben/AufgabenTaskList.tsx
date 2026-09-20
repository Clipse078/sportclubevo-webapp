"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { Check, ChevronRight, MoreHorizontal, Repeat2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskManagementListItem } from "@/lib/tasks/management-service";
import type { TaskDto } from "@/lib/tasks/types";
import {
  assignAufgabeAction,
  completeAufgabeAction,
  updateAufgabeStatusAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import { formatAssigneeName } from "@/lib/tasks/management-labels";
import {
  taskPriorityPresentation,
  taskStatusBadgeClass,
  taskStatusPresentation,
} from "@/lib/tasks/management-presentation";

type Props = {
  items: TaskManagementListItem[];
  locale: string;
  timeZone: string;
  canAssign: boolean;
  canComplete: boolean;
  assigneeOptions: TaskAssigneeOption[];
  showParentContext: boolean;
};

function AssigneeCompact({ assignees }: { assignees: TaskDto["assignees"] }) {
  if (assignees.length === 0) {
    return <span className="text-[0.8125rem] text-[var(--muted)]">—</span>;
  }
  const first = assignees[0]!;
  const firstName = formatAssigneeName(first.firstName, first.lastName);
  if (assignees.length === 1) {
    return <span className="truncate text-[0.8125rem] text-[var(--text-2)]">{firstName}</span>;
  }
  return (
    <span className="truncate text-[0.8125rem] text-[var(--text-2)]">
      {firstName}{" "}
      <span className="text-[var(--muted)]">+{assignees.length - 1}</span>
    </span>
  );
}

function TaskRowActions({
  task,
  canAssign,
  canComplete,
  assigneeOptions,
}: {
  task: TaskDto;
  canAssign: boolean;
  canComplete: boolean;
  assigneeOptions: TaskAssigneeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const canMarkDone = canComplete && task.status !== "DONE" && task.status !== "CANCELLED";

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      await action();
      setOpen(false);
    });
  }

  return (
    <div className="relative flex items-center justify-end gap-1">
      {canMarkDone ? (
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-950/30"
          title="Als erledigt markieren"
          aria-label={`${task.title} als erledigt markieren`}
          disabled={pending}
          onClick={() =>
            run(() =>
              completeAufgabeAction(
                (() => {
                  const fd = new FormData();
                  fd.set("taskId", task.id);
                  return fd;
                })(),
              ),
            )
          }
          data-testid={`aufgaben-complete-${task.id}`}
        >
          <Check className="h-4 w-4" />
        </button>
      ) : null}

      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
        aria-label="Weitere Aktionen"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid={`aufgaben-row-menu-${task.id}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
          <p className="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Status
          </p>
          {(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              disabled={pending || task.status === status}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)] disabled:opacity-40"
              onClick={() =>
                run(() =>
                  updateAufgabeStatusAction(
                    (() => {
                      const fd = new FormData();
                      fd.set("taskId", task.id);
                      fd.set("status", status);
                      return fd;
                    })(),
                  ),
                )
              }
            >
              {taskStatusPresentation(status).label}
            </button>
          ))}

          {canAssign ? (
            <>
              <p className="mt-2 px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Verantwortlich
              </p>
              <select
                className="fca-input mx-2 mb-1 w-[calc(100%-1rem)] text-xs"
                defaultValue={task.assignees[0]?.userId ?? ""}
                onChange={(e) =>
                  run(() =>
                    assignAufgabeAction(
                      (() => {
                        const fd = new FormData();
                        fd.set("taskId", task.id);
                        fd.set("assigneeUserId", e.target.value);
                        return fd;
                      })(),
                    ),
                  )
                }
                aria-label="Verantwortliche Person zuweisen"
              >
                <option value="">Nicht zugewiesen</option>
                {assigneeOptions.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SubtaskRow({
  subtask,
  locale,
  timeZone,
}: {
  subtask: TaskDto;
  locale: string;
  timeZone: string;
}) {
  const deadline = presentTaskDeadline({
    dueAt: subtask.dueAt,
    status: subtask.status,
    locale,
    timeZone,
  });
  const priority = taskPriorityPresentation(subtask.priority);
  const done = subtask.status === "DONE";

  return (
    <li
      className="grid grid-cols-1 gap-2 border-t border-[var(--border)]/50 py-2 pl-8 md:grid-cols-[minmax(0,1fr)_minmax(6rem,0.55fr)_minmax(5.5rem,0.45fr)_minmax(4.5rem,0.35fr)] md:items-center md:gap-3"
      data-testid={`aufgaben-subtask-${subtask.id}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.625rem]",
            done
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-[var(--border)] text-[var(--muted)]",
          )}
          aria-hidden="true"
        >
          {done ? "✓" : "○"}
        </span>
        <span
          className={cn(
            "min-w-0 text-[0.8125rem]",
            done ? "text-[var(--muted)] line-through" : "text-[var(--text-2)]",
          )}
        >
          <Link
            href={`/dashboard/aufgaben/${subtask.id}`}
            className="hover:text-[var(--primary)]"
          >
            {subtask.title}
          </Link>
        </span>
      </div>
      <AssigneeCompact assignees={subtask.assignees} />
      <span
        className={cn(
          "text-[0.75rem] tabular-nums",
          deadline.emphasis === "urgent" && "font-medium text-orange-400",
          deadline.emphasis === "attention" && "text-amber-300",
          deadline.emphasis === "calm" && "text-[var(--muted)]",
        )}
      >
        {deadline.label || "—"}
      </span>
      <span className={cn("text-[0.75rem]", priority.className)}>
        {priority.visible ? priority.label : ""}
      </span>
    </li>
  );
}

function TaskListRow({
  item,
  locale,
  timeZone,
  canAssign,
  canComplete,
  assigneeOptions,
  showParentContext,
}: {
  item: TaskManagementListItem;
  locale: string;
  timeZone: string;
  canAssign: boolean;
  canComplete: boolean;
  assigneeOptions: TaskAssigneeOption[];
  showParentContext: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { task, subtasks, progress, seriesRecurrenceLabel, parentTask, expandable } = item;

  const deadline = presentTaskDeadline({
    dueAt: task.dueAt,
    status: task.status,
    locale,
    timeZone,
  });
  const priority = taskPriorityPresentation(task.priority);
  const status = taskStatusPresentation(task.status);
  const contextLine = item.context?.compactSecondary ?? null;

  return (
    <article
      className="border-b border-[var(--border)]/70 last:border-b-0"
      data-testid={`aufgaben-row-${task.id}`}
    >
      <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_minmax(6.5rem,0.55fr)_minmax(5.5rem,0.45fr)_minmax(4.5rem,0.35fr)_minmax(5rem,0.4fr)_3rem] md:items-center md:gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            {expandable ? (
              <button
                type="button"
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                aria-expanded={expanded}
                aria-controls={`aufgaben-subtasks-${task.id}`}
                onClick={() => setExpanded((v) => !v)}
                data-testid={`aufgaben-expand-${task.id}`}
              >
                <ChevronRight
                  className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span className="inline-block w-6 shrink-0" aria-hidden="true" />
            )}

            <div className="min-w-0">
              <Link
                href={`/dashboard/aufgaben/${task.id}`}
                className="block truncate text-[0.9375rem] font-semibold leading-tight text-[var(--foreground)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                data-testid={`aufgaben-open-${task.id}`}
              >
                {task.title}
              </Link>
              {showParentContext && parentTask ? (
                <p className="truncate text-[0.75rem] text-[var(--muted)]">↳ {parentTask.title}</p>
              ) : null}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-[var(--muted)]">
                {progress.totalCount > 0 ? (
                  <span data-testid={`aufgaben-progress-${task.id}`}>{progress.label}</span>
                ) : null}
                {seriesRecurrenceLabel ? (
                  <span className="inline-flex items-center gap-1">
                    <Repeat2 className="h-3 w-3" aria-hidden="true" />
                    {seriesRecurrenceLabel}
                  </span>
                ) : null}
                {contextLine ? (
                  <span data-testid={`aufgaben-context-${task.id}`}>{contextLine}</span>
                ) : null}
                {item.organisationLabel ? (
                  <span data-testid={`aufgaben-org-${task.id}`}>{item.organisationLabel}</span>
                ) : null}
                {item.visibilityLabel ? (
                  <span
                    className="rounded border border-[var(--border)]/60 px-1 py-0.5"
                    data-testid={`aufgaben-visibility-${task.id}`}
                  >
                    {item.visibilityLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <span className={taskStatusBadgeClass(task.status)}>{status.label}</span>

        <div className="hidden md:block">
          <AssigneeCompact assignees={task.assignees} />
        </div>

        <span
          className={cn(
            "text-[0.8125rem] tabular-nums md:text-right",
            deadline.emphasis === "urgent" && "font-medium text-orange-400",
            deadline.emphasis === "attention" && "text-amber-300",
            deadline.emphasis === "calm" && "text-[var(--text-2)]",
          )}
        >
          {deadline.label || <span className="sr-only">Kein Termin</span>}
        </span>

        <span className={cn("hidden text-[0.8125rem] md:inline", priority.className)}>
          {priority.visible ? priority.label : ""}
        </span>

        <TaskRowActions
          task={task}
          canAssign={canAssign}
          canComplete={canComplete}
          assigneeOptions={assigneeOptions}
        />
      </div>

      {expanded && subtasks.length > 0 ? (
        <ul id={`aufgaben-subtasks-${task.id}`} className="px-4 pb-3">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              locale={locale}
              timeZone={timeZone}
            />
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default function AufgabenTaskList({
  items,
  locale,
  timeZone,
  canAssign,
  canComplete,
  assigneeOptions,
  showParentContext,
}: Props) {
  const stableItems = useMemo(() => items, [items]);

  return (
    <div data-testid="aufgaben-task-list">
      <div className="hidden border-b border-[var(--border)]/60 bg-[var(--surface-2)]/25 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)] md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(6.5rem,0.55fr)_minmax(5.5rem,0.45fr)_minmax(4.5rem,0.35fr)_minmax(5rem,0.4fr)_3rem] md:gap-3">
        <span>Aufgabe</span>
        <span>Status</span>
        <span className="hidden md:inline">Verantwortlich</span>
        <span className="md:text-right">Termin</span>
        <span className="hidden md:inline">Priorität</span>
        <span className="sr-only">Aktionen</span>
      </div>

      {stableItems.map((item) => (
        <TaskListRow
          key={item.task.id}
          item={item}
          locale={locale}
          timeZone={timeZone}
          canAssign={canAssign}
          canComplete={canComplete}
          assigneeOptions={assigneeOptions}
          showParentContext={showParentContext}
        />
      ))}
    </div>
  );
}
