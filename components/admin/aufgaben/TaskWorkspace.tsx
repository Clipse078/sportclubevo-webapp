"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition, type KeyboardEvent } from "react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  ArrowLeft,
  MoreHorizontal,
  Repeat2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import {
  SCE_DIALOG_BODY,
  SCE_DIALOG_HEADER,
  SCE_DIALOG_WORKSPACE_PANEL,
} from "@/lib/shell/responsive-layout";
import { useSceModalDialog } from "@/lib/ui/use-sce-modal-dialog";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import {
  TASK_PRIORITY_LABELS,
  formatAssigneeName,
} from "@/lib/tasks/management-labels";
import {
  taskPriorityPresentation,
  taskStatusBadgeClass,
  taskStatusPresentation,
} from "@/lib/tasks/management-presentation";
import type { TaskDto } from "@/lib/tasks/types";
import {
  assignAufgabeAction,
  cancelAufgabeAction,
  completeAufgabeAction,
  createSubtaskAction,
  updateAufgabeDescriptionAction,
  updateAufgabePriorityAction,
  updateAufgabeStatusAction,
  updateAufgabeTitleAction,
  updateAufgabeContextAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";
import type { TaskWorkspaceViewProps } from "@/lib/tasks/task-workspace-view-props";
import { TaskFollowControl } from "@/components/admin/aufgaben/TaskFollowControl";
import { TaskDocumentReferencesSection } from "@/components/admin/aufgaben/TaskDocumentReferencesSection";
import type { TaskContextPresentation } from "@/lib/tasks/context-presentation";
import TaskContextField from "./TaskContextField";
import TaskOrgVisibilityEditor from "./TaskOrgVisibilityEditor";
import { TaskDeadlineReminderEditor } from "./TaskDeadlineReminderEditor";
import { TaskActivitySection } from "./TaskActivitySection";

function InlineTitle({
  task,
  canEdit,
}: {
  task: TaskDto;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!canEdit || pending) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", task.id);
      fd.set("title", value);
      const result = await updateAufgabeTitleAction(fd);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  if (!canEdit) {
    return (
      <h1 className="text-lg font-semibold leading-snug text-[var(--foreground)]">
        {task.title}
      </h1>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="text-left text-lg font-semibold leading-snug text-[var(--foreground)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        onClick={() => {
          setValue(task.title);
          setEditing(true);
        }}
        data-testid="task-workspace-title"
      >
        {task.title}
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <input
        className="fca-input w-full text-lg font-semibold"
        value={value}
        autoFocus
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setValue(task.title);
            setEditing(false);
          }
        }}
        onBlur={save}
        data-testid="task-workspace-title-input"
      />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function TaskContextSection({
  taskId,
  context,
  canEdit,
}: {
  taskId: string;
  context: TaskContextPresentation | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!context && !canEdit) return null;

  if (editing && canEdit) {
    return (
      <section className="rounded-lg border border-[var(--border)]/70 px-3 py-2.5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Kontext
        </p>
        <form
          className="mt-2 space-y-2"
          action={(formData) => {
            startTransition(async () => {
              formData.set("taskId", taskId);
              const result = await updateAufgabeContextAction(formData);
              if (result.ok) {
                setEditing(false);
                router.refresh();
              }
            });
          }}
        >
          <TaskContextField
            initialContextType={null}
            initialContextId={null}
            disabled={pending}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="fca-button-primary text-xs" disabled={pending}>
              Speichern
            </button>
            <button
              type="button"
              className="fca-button-secondary text-xs"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </button>
            {context ? (
              <button
                type="button"
                className="fca-button-secondary text-xs text-red-300"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set("taskId", taskId);
                    fd.set("removeContext", "true");
                    await updateAufgabeContextAction(fd);
                    setEditing(false);
                    router.refresh();
                  });
                }}
              >
                Kontext entfernen
              </button>
            ) : null}
          </div>
        </form>
      </section>
    );
  }

  if (!context) {
    return canEdit ? (
      <section className="rounded-lg border border-dashed border-[var(--border)]/60 px-3 py-2.5">
        <button
          type="button"
          className="text-sm text-[var(--sce-primary)] hover:underline"
          onClick={() => setEditing(true)}
        >
          Kontext hinzufügen
        </button>
      </section>
    ) : null;
  }

  return (
    <section className="rounded-lg border border-[var(--border)]/70 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Kontext
        </p>
        {canEdit ? (
          <button
            type="button"
            className="text-xs text-[var(--sce-primary)] hover:underline"
            onClick={() => setEditing(true)}
          >
            Bearbeiten
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-[var(--text-2)]">
        {context.typeLabel}
        {context.title ? ` · ${context.title}` : ""}
      </p>
      {context.subtitle ? (
        <p className="text-xs text-[var(--muted)]">{context.subtitle}</p>
      ) : null}
      {context.href ? (
        <Link href={context.href} className="sce-link-primary mt-1 inline-block text-sm">
          {context.title ?? context.typeLabel} öffnen →
        </Link>
      ) : null}
    </section>
  );
}

function InlineDescription({
  task,
  canEdit,
}: {
  task: TaskDto;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.description ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!canEdit || pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", task.id);
      fd.set("description", value);
      const result = await updateAufgabeDescriptionAction(fd);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  const empty = !task.description?.trim();

  if (!canEdit && empty) {
    return null;
  }

  if (!canEdit) {
    return (
      <p className="whitespace-pre-wrap text-sm text-[var(--text-2)]">{task.description}</p>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          "w-full rounded-lg border border-transparent px-2 py-2 text-left text-sm hover:border-[var(--border)] hover:bg-[var(--surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
          empty && "text-[var(--muted)] italic",
        )}
        onClick={() => {
          setValue(task.description ?? "");
          setEditing(true);
        }}
        data-testid="task-workspace-description"
      >
        {empty ? "Beschreibung hinzufügen" : task.description}
      </button>
    );
  }

  return (
    <textarea
      className="fca-input min-h-[6rem] w-full text-sm"
      value={value}
      autoFocus
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setValue(task.description ?? "");
          setEditing(false);
        }
      }}
      onBlur={save}
      data-testid="task-workspace-description-input"
    />
  );
}

function AssigneeEditor({
  task,
  assigneeOptions,
  canAssign,
  onAssign,
  pending,
}: {
  task: TaskDto;
  assigneeOptions: TaskAssigneeOption[];
  canAssign: boolean;
  pending: boolean;
  onAssign: (userIds: string[]) => void;
}) {
  const selected = new Set(task.assignees.map((a) => a.userId));

  if (!canAssign) {
    return <AssigneeAvatars assignees={task.assignees} />;
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-[var(--border)]/70 p-2">
      {assigneeOptions.map((a) => {
        const checked = selected.has(a.userId);
        return (
          <label
            key={a.userId}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-[var(--surface-2)]"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={pending}
              onChange={() => {
                const next = new Set(selected);
                if (next.has(a.userId)) {
                  next.delete(a.userId);
                } else {
                  next.add(a.userId);
                }
                onAssign([...next]);
              }}
            />
            {a.firstName} {a.lastName}
          </label>
        );
      })}
    </div>
  );
}

function AssigneeAvatars({ assignees }: { assignees: TaskDto["assignees"] }) {
  if (assignees.length === 0) {
    return <span className="text-sm text-[var(--muted)]">Nicht zugewiesen</span>;
  }
  const visible = assignees.slice(0, 3);
  const overflow = assignees.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((a) => (
        <span
          key={a.userId}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/50 px-2 py-0.5 text-xs text-[var(--text-2)]"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-3)] text-[0.625rem] font-semibold">
            {a.firstName.charAt(0)}
            {a.lastName.charAt(0)}
          </span>
          {formatAssigneeName(a.firstName, a.lastName)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="text-xs text-[var(--muted)]">+{overflow}</span>
      ) : null}
    </div>
  );
}

function SubtaskCreateInline({
  parentTaskId,
  assigneeOptions,
  canCreate,
}: {
  parentTaskId: string;
  assigneeOptions: TaskAssigneeOption[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canCreate) return null;

  function submit(formData: FormData) {
    setError(null);
    formData.set("parentTaskId", parentTaskId);
    startTransition(async () => {
      const result = await createSubtaskAction(formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="mt-2 text-sm font-medium text-[var(--primary)] hover:underline"
        onClick={() => setOpen(true)}
        data-testid="task-workspace-subtask-add"
      >
        + Unteraufgabe hinzufügen
      </button>
    );
  }

  return (
    <form action={submit} className="mt-3 space-y-2 rounded-lg border border-[var(--border)] p-3">
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <input name="title" required className="fca-input w-full text-sm" placeholder="Titel" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="assigneeUserId" className="fca-input text-sm">
          <option value="">Verantwortlich (optional)</option>
          {assigneeOptions.map((a) => (
            <option key={a.userId} value={a.userId}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
        <input type="date" name="dueAt" className="fca-input text-sm" />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="fca-button-secondary text-xs"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Abbrechen
        </button>
        <button type="submit" className="fca-button-primary text-xs" disabled={pending}>
          Hinzufügen
        </button>
      </div>
    </form>
  );
}

export function TaskWorkspacePanel({
  bundle,
  assigneeOptions,
  orgUnitOptions,
  orgUnitDisplayLabel,
  locale,
  timeZone,
  backHref,
  presentation,
  currentUserId,
  onClose,
}: TaskWorkspaceViewProps) {
  const router = useRouter();
  const {
    task,
    parentTask,
    subtasks,
    progress,
    seriesRecurrenceLabel,
    seriesId,
    seriesTitle,
    canOpenSeriesWorkspace,
    context,
    creator,
    capabilities,
    follow,
    documentReferences,
  } = bundle;
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const deadline = presentTaskDeadline({
    dueAt: task.dueAt,
    status: task.status,
    locale,
    timeZone,
  });
  const priority = taskPriorityPresentation(task.priority);
  const status = taskStatusPresentation(task.status);

  const runAction = useCallback(
    (runner: () => Promise<{ ok: boolean; message?: string }>) => {
      setActionError(null);
      startTransition(async () => {
        const result = await runner();
        if (!result.ok && result.message) {
          setActionError(result.message);
        } else if (result.ok) {
          router.refresh();
        }
        setMenuOpen(false);
      });
    },
    [router],
  );

  function navigateToTask(id: string) {
    router.push(`/dashboard/aufgaben/${id}`);
  }

  function handleClose() {
    if (onClose) {
      onClose();
      return;
    }
    router.push(backHref);
  }

  const headerStatus = (
    <span className={cn("shrink-0", taskStatusBadgeClass(task.status))}>{status.label}</span>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="task-workspace">
      <header className={cn(SCE_DIALOG_HEADER, "items-center py-3")}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
            aria-label="Zurück zur Übersicht"
            onClick={(e) => {
              if (presentation === "modal" && onClose) {
                e.preventDefault();
                onClose();
              }
            }}
            data-testid="task-workspace-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            {parentTask ? (
              <p className="truncate text-xs text-[var(--muted)]">
                Unteraufgabe von{" "}
                <button
                  type="button"
                  className="text-[var(--primary)] hover:underline"
                  onClick={() => navigateToTask(parentTask.id)}
                >
                  {parentTask.title}
                </button>
              </p>
            ) : null}
            <InlineTitle task={task} canEdit={capabilities.canEditTitle} />
          </div>
          {headerStatus}
        </div>
        <div className="flex items-center gap-1">
          {presentation === "modal" ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
              aria-label="Schliessen"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
              aria-label="Aktionen"
              onClick={() => setMenuOpen((v) => !v)}
              data-testid="task-workspace-overflow"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                {capabilities.canComplete && task.status !== "DONE" && task.status !== "CANCELLED" ? (
                  <button
                    type="button"
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                    disabled={pending}
                    onClick={() =>
                      runAction(() => {
                        const fd = new FormData();
                        fd.set("taskId", task.id);
                        return completeAufgabeAction(fd);
                      })
                    }
                  >
                    Aufgabe abschließen
                  </button>
                ) : null}
                {capabilities.canCancel && task.status !== "CANCELLED" ? (
                  <button
                    type="button"
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                    disabled={pending}
                    onClick={() =>
                      runAction(() => {
                        const fd = new FormData();
                        fd.set("taskId", task.id);
                        return cancelAufgabeAction(fd);
                      })
                    }
                  >
                    Abbrechen
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {actionError ? (
        <p className="border-b border-red-500/20 bg-red-950/20 px-6 py-2 text-sm text-red-200">
          {actionError}
        </p>
      ) : null}

      <div className={cn(SCE_DIALOG_BODY, "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]")}>
        <div className="min-w-0 space-y-5">
          <InlineDescription task={task} canEdit={capabilities.canEditDescription} />

          {!task.parentTaskId ? (
            <section aria-labelledby="task-subtasks-heading">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 id="task-subtasks-heading" className="text-sm font-semibold text-[var(--foreground)]">
                  Unteraufgaben
                </h2>
                {progress.totalCount > 0 ? (
                  <span className="text-xs text-[var(--muted)]" data-testid="task-workspace-progress">
                    {progress.label}
                  </span>
                ) : null}
              </div>
              {subtasks.length > 0 ? (
                <ul className="divide-y divide-[var(--border)]/60 rounded-lg border border-[var(--border)]">
                  {subtasks.map((sub) => {
                    const subDeadline = presentTaskDeadline({
                      dueAt: sub.dueAt,
                      status: sub.status,
                      locale,
                      timeZone,
                    });
                    return (
                      <li key={sub.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                          onClick={() => navigateToTask(sub.id)}
                          data-testid={`task-workspace-subtask-${sub.id}`}
                        >
                          {sub.title}
                        </button>
                        <span className={taskStatusBadgeClass(sub.status)}>
                          {taskStatusPresentation(sub.status).label}
                        </span>
                        <AssigneeAvatars assignees={sub.assignees} />
                        <span className="text-xs text-[var(--muted)]">{subDeadline.label || "—"}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted)]">Noch keine Unteraufgaben.</p>
              )}
              <SubtaskCreateInline
                parentTaskId={task.id}
                assigneeOptions={assigneeOptions}
                canCreate={capabilities.canCreateSubtask}
              />
            </section>
          ) : null}

          <TaskContextSection
            taskId={task.id}
            context={context}
            canEdit={capabilities.canEditContext}
          />

          <TaskDocumentReferencesSection
            taskId={task.id}
            references={documentReferences}
            canLink={capabilities.canLinkDocuments}
          />

          <div className="space-y-2">
            <TaskFollowControl taskId={task.id} initialState={follow} />
            <TaskActivitySection
              taskId={task.id}
              currentUserId={currentUserId}
              canCollaborate
              locale={locale}
              timeZone={timeZone}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:border-l lg:border-[var(--border)]/60 lg:pl-5">
          <PropertyRow label="Status">
            {capabilities.canEditStatus ? (
              <select
                className="fca-input w-full text-sm"
                value={task.status}
                disabled={pending}
                onChange={(e) =>
                  runAction(() => {
                    const fd = new FormData();
                    fd.set("taskId", task.id);
                    fd.set("status", e.target.value);
                    return updateAufgabeStatusAction(fd);
                  })
                }
                data-testid="task-workspace-status"
              >
                {(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {taskStatusPresentation(s).label}
                  </option>
                ))}
              </select>
            ) : (
              <span className={taskStatusBadgeClass(task.status)}>{status.label}</span>
            )}
          </PropertyRow>

          <PropertyRow label="Verantwortlich">
            <AssigneeEditor
              task={task}
              assigneeOptions={assigneeOptions}
              canAssign={capabilities.canAssign}
              pending={pending}
              onAssign={(userIds) =>
                runAction(() => {
                  const fd = new FormData();
                  fd.set("taskId", task.id);
                  fd.set("assigneeUserIds", userIds.join(","));
                  return assignAufgabeAction(fd);
                })
              }
            />
          </PropertyRow>

          <PropertyRow label="Priorität">
            {capabilities.canEditPriority ? (
              <select
                className="fca-input w-full text-sm"
                value={task.priority}
                disabled={pending}
                onChange={(e) =>
                  runAction(() => {
                    const fd = new FormData();
                    fd.set("taskId", task.id);
                    fd.set("priority", e.target.value);
                    return updateAufgabePriorityAction(fd);
                  })
                }
              >
                {(["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            ) : (
              <span className={cn("text-sm", priority.className)}>
                {priority.visible ? priority.label : TASK_PRIORITY_LABELS[task.priority]}
              </span>
            )}
          </PropertyRow>

          <PropertyRow label="Deadline">
            {capabilities.canEditDueAt ? (
              <TaskDeadlineReminderEditor
                task={task}
                timeZone={timeZone}
                disabled={pending}
                onError={(message) => setActionError(message)}
                onUpdated={() => router.refresh()}
              />
            ) : (
              <span
                className={cn(
                  "text-sm tabular-nums",
                  deadline.emphasis === "urgent" && "font-medium text-orange-400",
                  deadline.emphasis === "attention" && "text-amber-300",
                )}
              >
                {deadline.label || "Kein Termin"}
              </span>
            )}
          </PropertyRow>

          {seriesRecurrenceLabel ? (
            <PropertyRow label="Wiederkehrende Aufgabe">
              {canOpenSeriesWorkspace && seriesId ? (
                <Link
                  href={`/dashboard/aufgaben/serien/${seriesId}`}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--sce-primary)] hover:underline"
                  data-testid="task-workspace-series-link"
                >
                  <Repeat2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {seriesTitle ?? seriesRecurrenceLabel}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-2)]">
                  <Repeat2 className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
                  {seriesTitle ?? seriesRecurrenceLabel}
                </span>
              )}
              {seriesTitle ? (
                <p className="mt-0.5 text-xs text-[var(--muted)]">{seriesRecurrenceLabel}</p>
              ) : null}
            </PropertyRow>
          ) : null}

          {context ? (
            <PropertyRow label="Kontext">
              <span className="text-sm text-[var(--text-2)]">
                {context.compactSecondary ?? context.typeLabel}
              </span>
            </PropertyRow>
          ) : null}

          <TaskOrgVisibilityEditor
            task={task}
            orgUnitOptions={orgUnitOptions}
            orgUnitDisplayLabel={orgUnitDisplayLabel}
            canEdit={capabilities.canEditOrgVisibility}
          />

          <PropertyRow label="Erstellt">
            <span className="text-xs text-[var(--muted)]">
              {creator
                ? `${formatAssigneeName(creator.firstName, creator.lastName)} · `
                : ""}
              {new Date(task.createdAt).toLocaleString(locale, { timeZone })}
            </span>
          </PropertyRow>

          <PropertyRow label="Aktualisiert">
            <span className="text-xs text-[var(--muted)]">
              {new Date(task.updatedAt).toLocaleString(locale, { timeZone })}
            </span>
          </PropertyRow>

          {capabilities.readOnly ? (
            <p className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 px-2 py-1.5 text-xs text-[var(--muted)]">
              Nur-Lese-Zugriff — Änderungen sind nicht erlaubt.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

export function TaskWorkspaceModal({
  bundle,
  assigneeOptions,
  orgUnitOptions,
  orgUnitDisplayLabel,
  locale,
  timeZone,
  backHref,
  currentUserId,
  onClose,
}: TaskWorkspaceViewProps & { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useSceModalDialog({ open: true, onClose, panelRef });

  return (
    <SceModalOverlay open onBackdropClick={onClose} testId="task-workspace-modal">
      <div ref={panelRef} className={cn(SCE_DIALOG_WORKSPACE_PANEL, "w-full")} role="dialog" aria-modal="true">
        <TaskWorkspacePanel
          bundle={bundle}
          assigneeOptions={assigneeOptions}
          orgUnitOptions={orgUnitOptions}
          orgUnitDisplayLabel={orgUnitDisplayLabel}
          locale={locale}
          timeZone={timeZone}
          backHref={backHref}
          currentUserId={currentUserId}
          presentation="modal"
          onClose={onClose}
        />
      </div>
    </SceModalOverlay>
  );
}
