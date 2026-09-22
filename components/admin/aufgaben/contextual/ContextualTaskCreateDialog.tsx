"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { TaskContextType } from "@prisma/client";
import type { TaskContextPresentation } from "@/lib/tasks/context-resolution";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { taskContextTypeLabel } from "@/lib/tasks/context-registry";
import { createContextualAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import TaskOrgVisibilityFields from "../TaskOrgVisibilityFields";
import { TaskDeadlineFields } from "../TaskReminderFields";
import TaskDescriptionFormField from "../TaskDescriptionFormField";
import TaskPeopleMultiPicker from "../TaskPeopleMultiPicker";
import TaskPriorityField from "../TaskPriorityField";
import { Dialog } from "@/components/ui/Dialog";

export type ContextualTaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType: TaskContextType;
  contextId: string;
  presentation: TaskContextPresentation | null;
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
  orgUnitOptions,
  timeZone,
  tenantWideVisibility,
}: ContextualTaskCreateDialogProps) {
  void tenantWideVisibility;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const contextLabel = presentation?.title ?? taskContextTypeLabel(contextType);
  const contextSecondary =
    presentation?.subtitle ??
    presentation?.compactSecondary ??
    taskContextTypeLabel(contextType);

  function onSubmit(formData: FormData) {
    setError(null);
    const visibility = formData.get("visibilityScope");
    const orgGrants = formData.get("orgUnitGrantIds");
    if (
      visibility === "ORG_UNIT" &&
      !(typeof orgGrants === "string" && orgGrants.trim())
    ) {
      setError("Bitte mindestens eine Organisationseinheit wählen.");
      return;
    }
    formData.set("assigneeUserIds", assigneeUserIds.join(","));
    startTransition(async () => {
      const result = await createContextualAufgabeAction(contextType, contextId, formData);
      if (result.ok && result.taskId) {
        onOpenChange(false);
        setTitle("");
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
    <Dialog
      open={open}
      onClose={() => !pending && onOpenChange(false)}
      title="Aufgabe erstellen"
      description="Kontext ist fest mit dieser Entität verknüpft."
      size="standard"
      footer={
        <button
          type="submit"
          form="contextual-task-create-form"
          className="fca-button-primary w-full text-sm sm:w-auto sm:min-w-[12rem]"
          disabled={pending}
          data-testid="contextual-task-create-submit"
        >
          {pending ? "Erstellen …" : "Aufgabe erstellen"}
        </button>
      }
    >
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

      <form
        id="contextual-task-create-form"
        ref={formRef}
        action={onSubmit}
        className="space-y-4"
        data-testid="contextual-task-create-dialog"
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
          <input
            name="title"
            required
            className="fca-input w-full text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="contextual-task-create-title"
          />
        </label>

        <TaskDescriptionFormField optional inputId="contextual-task-create-description" />

        <div className="grid gap-4 sm:grid-cols-2">
          <TaskPeopleMultiPicker
            label="Verantwortlich"
            fieldName="assigneeUserIds"
            selectedIds={assigneeUserIds}
            onSelectedIdsChange={setAssigneeUserIds}
            disabled={pending}
            testIdPrefix="contextual-task-create-assignees"
          />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Priorität</span>
            <TaskPriorityField disabled={pending} testId="contextual-task-create-priority" />
          </label>
        </div>

        <TaskDeadlineFields timeZone={timeZone} dueAt={null} />

        <div className="space-y-2 border-t border-[var(--border)]/60 pt-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Organisation &amp; Sichtbarkeit
          </p>
          <TaskOrgVisibilityFields orgUnitOptions={orgUnitOptions} />
        </div>
      </form>
    </Dialog>
  );
}
