"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEventHandler } from "react";
import { ChevronDown } from "lucide-react";
import type { TaskContextType } from "@prisma/client";
import TaskPeopleMultiPicker from "./TaskPeopleMultiPicker";
import TaskPriorityField from "./TaskPriorityField";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { createAufgabeFullAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import TaskContextField from "./TaskContextField";
import TaskOrgVisibilityFields from "./TaskOrgVisibilityFields";
import { TaskDeadlineFields, TaskReminderFields } from "./TaskReminderFields";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type Props = {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  initialContextType?: TaskContextType | null;
  initialContextId?: string | null;
  initialContextLabel?: string | null;
  initialTitle?: string;
  originMeetingSlug?: string | null;
  defaultExpanded?: boolean;
};

export default function AufgabenFullCreateCollapsibleCard({
  orgUnitOptions,
  timeZone,
  initialContextType = null,
  initialContextId = null,
  initialContextLabel = null,
  initialTitle = "",
  originMeetingSlug = null,
  defaultExpanded = true,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [fieldsKey, setFieldsKey] = useState(0);

  const formId = "aufgaben-full-create-collapsible-form";

  function clearDraft() {
    setError(null);
    setAssigneeUserIds([]);
    setFieldsKey((k) => k + 1);
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const visibility = formData.get("visibilityScope");
    const orgGrants = formData.get("orgUnitGrantIds");
    if (visibility === "ORG_UNIT" && !(typeof orgGrants === "string" && orgGrants.trim())) {
      setError("Bitte mindestens eine Organisationseinheit wählen.");
      return;
    }
    formData.set("assigneeUserIds", assigneeUserIds.join(","));
    startTransition(async () => {
      const result = await createAufgabeFullAction(formData);
      if (result.ok && result.taskId) {
        clearDraft();
        setExpanded(false);
        router.push(taskWorkspaceHref(result.taskId));
        return;
      }
      if (!result.ok) {
        setError(result.message);
      }
    });
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid="aufgaben-full-create-collapsible-card"
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
          aria-expanded={expanded}
          aria-controls="aufgaben-full-create-panel"
          onClick={() => setExpanded(!expanded)}
          data-testid="aufgaben-full-create-collapse"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Aufgabe erstellen
          </span>
        </button>
      </div>

      <div id="aufgaben-full-create-panel" hidden={!expanded} className="p-4">
        {error ? (
          <p
            className="mb-4 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {initialContextType && initialContextId ? (
          <section
            className="mb-4 rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/60 px-3 py-2"
            data-testid="task-create-origin-context"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Entstehungskontext</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
              {initialContextLabel ?? initialContextType}
            </p>
            {originMeetingSlug ? (
              <p className="mt-2 text-xs text-[var(--text-2)]">
                Sitzungsbezug:{" "}
                <Link
                  href={`/vereinsleitung/meetings/${encodeURIComponent(originMeetingSlug)}`}
                  className="text-[#0b4aa2] hover:underline"
                >
                  Zur Sitzung
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        <form
          key={fieldsKey}
          id={formId}
          onSubmit={onSubmit}
          className="space-y-4"
          data-testid="aufgaben-full-create-collapsible-form"
        >
          <ContextualTaskCreateFormFields
            orgUnitOptions={orgUnitOptions}
            timeZone={timeZone}
            initialTitle={initialTitle}
            initialContextType={initialContextType}
            initialContextId={initialContextId}
            initialContextLabel={initialContextLabel}
            assigneeUserIds={assigneeUserIds}
            onAssigneeUserIdsChange={setAssigneeUserIds}
            pending={pending}
          />
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            form={formId}
            className={workspacePrimaryButtonClass}
            disabled={pending}
            data-testid="aufgaben-full-create-submit"
          >
            {pending ? "Erstellen …" : "Aufgabe erstellen"}
          </button>
          <button
            type="button"
            className={workspaceGhostButtonClass}
            disabled={pending}
            onClick={() => {
              clearDraft();
              setExpanded(false);
            }}
            data-testid="aufgaben-full-create-cancel"
          >
            Abbrechen
          </button>
          <button
            type="button"
            className={workspaceGhostButtonClass}
            disabled={pending}
            onClick={() => setExpanded(false)}
            data-testid="aufgaben-full-create-collapse-action"
          >
            Einklappen
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextualTaskCreateFormFields({
  orgUnitOptions,
  timeZone,
  initialTitle,
  initialContextType,
  initialContextId,
  initialContextLabel,
  assigneeUserIds,
  onAssigneeUserIdsChange,
  pending,
}: {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  initialTitle: string;
  initialContextType: TaskContextType | null;
  initialContextId: string | null;
  initialContextLabel: string | null;
  assigneeUserIds: string[];
  onAssigneeUserIdsChange: (ids: string[]) => void;
  pending: boolean;
}) {
  return (
    <>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-[var(--foreground)]">Titel</span>
        <input
          name="title"
          required
          defaultValue={initialTitle}
          className="fca-input w-full text-sm"
        />
      </label>
      <TaskDescriptionFormField label="Beschreibung" inputId="aufgaben-full-create-description" />
      <TaskPeopleMultiPicker
        label="Verantwortlich"
        fieldName="assigneeUserIds"
        selectedIds={assigneeUserIds}
        onSelectedIdsChange={onAssigneeUserIdsChange}
        disabled={pending}
        addButtonLabel="Person hinzufügen"
        testIdPrefix="task-create-assignees"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-[var(--foreground)]">Priorität</span>
          <TaskPriorityField disabled={pending} testId="task-create-priority" />
        </label>
        <TaskDeadlineFields timeZone={timeZone} dueAt={null} />
      </div>
      <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
          Organisation & Sichtbarkeit
        </summary>
        <div className="mt-4 space-y-4">
          <TaskContextField
            initialContextType={initialContextType}
            initialContextId={initialContextId}
            initialContextLabel={initialContextLabel}
            disabled={Boolean(initialContextType && initialContextId)}
          />
          <TaskOrgVisibilityFields orgUnitOptions={orgUnitOptions} />
          <TaskReminderFields
            timeZone={timeZone}
            values={{
              reminder1At: null,
              reminder2At: null,
              reminder1PresetKey: null,
              reminder2PresetKey: null,
            }}
          />
        </div>
      </details>
    </>
  );
}
