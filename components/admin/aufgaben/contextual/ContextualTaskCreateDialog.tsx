"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskContextType, TaskPriority } from "@prisma/client";
import { X } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskContextPresentation } from "@/lib/tasks/context-resolution";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { taskContextTypeLabel } from "@/lib/tasks/context-registry";
import { createContextualAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import TaskOrgVisibilityFields from "../TaskOrgVisibilityFields";
import { TaskDeadlineFields } from "../TaskReminderFields";

export type ContextualTaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType: TaskContextType;
  contextId: string;
  presentation: TaskContextPresentation | null;
  assigneeOptions: TaskAssigneeOption[];
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  tenantWideVisibility: boolean;
  returnHref?: string;
};

export default function ContextualTaskCreateDialog({
  open,
  onOpenChange,
  contextType,
  contextId,
  presentation,
  assigneeOptions,
  orgUnitOptions,
  timeZone,
  tenantWideVisibility,
}: ContextualTaskCreateDialogProps) {
  void tenantWideVisibility;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const contextLabel = presentation?.title ?? taskContextTypeLabel(contextType);
  const contextSecondary =
    presentation?.subtitle ??
    presentation?.compactSecondary ??
    taskContextTypeLabel(contextType);

  function onSubmit(formData: FormData) {
    setError(null);
    const visibility = formData.get("visibilityScope");
    const orgUnit = formData.get("orgUnitId");
    if (
      visibility === "ORG_UNIT" &&
      !(typeof orgUnit === "string" && orgUnit.trim())
    ) {
      setError("Bitte eine Organisationseinheit für «Organisationseinheit» wählen.");
      return;
    }
    startTransition(async () => {
      const result = await createContextualAufgabeAction(contextType, contextId, formData);
      if (result.ok && result.taskId) {
        onOpenChange(false);
        router.push(taskWorkspaceHref(result.taskId));
        router.refresh();
        return;
      }
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      role="presentation"
      onClick={() => !pending && onOpenChange(false)}
      data-testid="contextual-task-create-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contextual-task-create-title"
        className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="contextual-task-create-dialog"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2
              id="contextual-task-create-title"
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Aufgabe erstellen
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Kontext ist fest mit dieser Entität verknüpft.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            onClick={() => onOpenChange(false)}
            aria-label="Dialog schliessen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="mb-4 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/40 px-3 py-2.5"
          data-testid="contextual-task-fixed-context"
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kontext
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{contextLabel}</p>
          <p className="text-xs text-[var(--text-2)]">{contextSecondary}</p>
        </div>

        {error ? (
          <p className="mb-3 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <form action={onSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
            <input name="title" required className="fca-input w-full text-sm" autoFocus />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Beschreibung (optional)</span>
            <textarea name="description" rows={3} className="fca-input w-full text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Verantwortlich</span>
            <select name="assigneeUserIds" className="fca-input w-full text-sm">
              <option value="">Optional</option>
              {assigneeOptions.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Priorität</span>
            <select name="priority" className="fca-input w-full text-sm" defaultValue="NORMAL">
              {(["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <TaskDeadlineFields timeZone={timeZone} dueAt={null} />
          <TaskOrgVisibilityFields orgUnitOptions={orgUnitOptions} />
          <button type="submit" className="fca-button-primary w-full text-sm" disabled={pending}>
            {pending ? "Erstellen …" : "Aufgabe erstellen"}
          </button>
        </form>
      </div>
    </div>
  );
}
