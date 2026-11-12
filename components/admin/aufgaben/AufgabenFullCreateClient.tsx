"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
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

type Props = {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  backHref: string;
  initialContextType?: TaskContextType | null;
  initialContextId?: string | null;
  initialContextLabel?: string | null;
  initialContextSecondary?: string | null;
  initialTitle?: string;
  originMeetingSlug?: string | null;
};

export default function AufgabenFullCreateClient({
  orgUnitOptions,
  timeZone,
  backHref,
  initialContextType = null,
  initialContextId = null,
  initialContextLabel = null,
  initialContextSecondary = null,
  initialTitle = "",
  originMeetingSlug = null,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);

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
      const result = await createAufgabeFullAction(formData);
      if (result.ok && result.taskId) {
        router.push(taskWorkspaceHref(result.taskId));
        return;
      }
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Aufgaben", href: backHref },
          { label: "Neu" },
        ]}
        header={{
          title: "Neue Aufgabe",
          description: "Alle Details für eine operative Aufgabe.",
          secondaryActions: (
            <Link href={backHref} className="fca-button-secondary text-sm">
              Zurück
            </Link>
          ),
        }}
        density="dense"
      >
        <div
          className={cn(SCE_DIALOG_WORKSPACE_PANEL, "min-h-[60vh] w-full")}
          data-testid="task-workspace-create"
        >
        <div className="mx-auto w-full max-w-5xl px-6 py-6">
          {error ? (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {initialContextType && initialContextId ? (
            <section
              className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3"
              data-testid="task-create-origin-context"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Entstehungskontext</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {initialContextLabel ?? initialContextType}
              </p>
              {initialContextSecondary ? (
                <p className="text-sm text-[var(--text-2)]">{initialContextSecondary}</p>
              ) : null}
              {originMeetingSlug ? (
                <p className="mt-2 text-xs text-[var(--text-2)]">
                  Sitzungsbezug:{" "}
                  <Link href={`/vereinsleitung/meetings/${encodeURIComponent(originMeetingSlug)}`} className="text-[#0b4aa2] hover:underline">
                    Zur Sitzung
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}

          <form action={onSubmit} className="space-y-6">
            <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
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
                onSelectedIdsChange={setAssigneeUserIds}
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
            </div>

            <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
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

            <div className="flex justify-end">
              <button type="submit" className="fca-button-primary px-6 text-sm" disabled={pending}>
                {pending ? "Erstellen …" : "Aufgabe erstellen"}
              </button>
            </div>
          </form>
        </div>
        </div>
      </SceWorkspaceChrome>
    </div>
  );
}
