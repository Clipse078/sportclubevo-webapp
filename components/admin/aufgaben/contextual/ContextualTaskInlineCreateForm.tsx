"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { TaskContextType } from "@prisma/client";
import type { TaskContextPresentation } from "@/lib/tasks/context-resolution";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { createContextualAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import TaskOrgVisibilityFields from "../TaskOrgVisibilityFields";
import { TaskDeadlineFields } from "../TaskReminderFields";
import TaskDescriptionFormField from "../TaskDescriptionFormField";
import TaskPeopleMultiPicker from "../TaskPeopleMultiPicker";
import TaskPriorityField from "../TaskPriorityField";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

export type ContextualTaskInlineCreateProps = {
  contextType: TaskContextType;
  contextId: string;
  presentation: TaskContextPresentation | null;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  tenantWideVisibility: boolean;
  onCancel: () => void;
  onCreated?: () => void;
  listenForOpenEvent?: boolean;
};

export default function ContextualTaskInlineCreateForm({
  contextType,
  contextId,
  presentation,
  orgUnitOptions,
  timeZone,
  tenantWideVisibility,
  onCancel,
  onCreated,
  listenForOpenEvent = false,
}: ContextualTaskInlineCreateProps) {
  void tenantWideVisibility;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!listenForOpenEvent) return;
    function handleOpen() {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    window.addEventListener("meeting-open-inline-task-create", handleOpen);
    return () => window.removeEventListener("meeting-open-inline-task-create", handleOpen);
  }, [listenForOpenEvent]);

  function onSubmit(formData: FormData) {
    setError(null);
    const visibility = formData.get("visibilityScope");
    const orgGrants = formData.get("orgUnitGrantIds");
    if (visibility === "ORG_UNIT" && !(typeof orgGrants === "string" && orgGrants.trim())) {
      setError("Bitte mindestens eine Organisationseinheit wählen.");
      return;
    }
    formData.set("assigneeUserIds", assigneeUserIds.join(","));
    startTransition(async () => {
      const result = await createContextualAufgabeAction(contextType, contextId, formData);
      if (result.ok) {
        setTitle("");
        setAssigneeUserIds([]);
        onCreated?.();
        onCancel();
        router.refresh();
        return;
      }
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4" data-testid="contextual-task-inline-create">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Neue Aufgabe</p>
      {presentation ? (
        <p className="mt-1 text-xs text-[var(--text-2)]">Kontext: {presentation.title}</p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      <form
        ref={formRef}
        action={onSubmit}
        className="mt-3 space-y-3"
      >
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[var(--muted)]">Titel *</span>
          <input
            name="title"
            required
            className={workspaceInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="contextual-task-inline-create-title"
          />
        </label>
        <TaskDescriptionFormField optional inputId="contextual-task-inline-description" />
        <div className="grid gap-3 sm:grid-cols-2">
          <TaskPeopleMultiPicker
            label="Verantwortlich"
            fieldName="assigneeUserIds"
            selectedIds={assigneeUserIds}
            onSelectedIdsChange={setAssigneeUserIds}
            disabled={pending}
            testIdPrefix="contextual-task-inline-assignees"
            panelHost="embedded"
          />
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Priorität</span>
            <TaskPriorityField disabled={pending} testId="contextual-task-inline-priority" />
          </label>
        </div>
        <TaskDeadlineFields timeZone={timeZone} dueAt={null} />
        <div className="space-y-2 border-t border-[var(--border)]/60 pt-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Organisation &amp; Sichtbarkeit
          </p>
          <TaskOrgVisibilityFields orgUnitOptions={orgUnitOptions} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className={workspacePrimaryButtonClass}
            disabled={pending || !title.trim()}
            data-testid="contextual-task-inline-submit"
          >
            Speichern
          </button>
          <button type="button" className={workspaceGhostButtonClass} disabled={pending} onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
