"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskVisibilityScope } from "@prisma/client";
import {
  formatTaskVisibilityLabel,
  TASK_VISIBILITY_SCOPE_LABELS,
} from "@/lib/tasks/management-labels";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import type { TaskDto } from "@/lib/tasks/types";
import type { TaskAccessGrantSnapshot } from "@/lib/tasks/task-access-grants";
import { updateAufgabeOrgVisibilityAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import TaskOrgVisibilityFields from "./TaskOrgVisibilityFields";

type Props = {
  task: TaskDto;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  orgUnitDisplayLabel: string;
  accessGrants: TaskAccessGrantSnapshot;
  canEdit: boolean;
};

export default function TaskOrgVisibilityEditor({
  task,
  orgUnitOptions,
  orgUnitDisplayLabel,
  accessGrants,
  canEdit,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <div className="space-y-2" data-testid="task-org-visibility-readonly">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Organisation
          </p>
          <p className="text-sm text-[var(--text-2)]">{orgUnitDisplayLabel}</p>
        </div>
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Sichtbarkeit
          </p>
          <p className="text-sm text-[var(--text-2)]">
            {formatTaskVisibilityLabel(task.visibilityScope)}
          </p>
        </div>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Organisation &amp; Sichtbarkeit
            </p>
            <p className="text-sm text-[var(--text-2)]">
              {orgUnitDisplayLabel} · {TASK_VISIBILITY_SCOPE_LABELS[task.visibilityScope]}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
            onClick={() => setEditing(true)}
            data-testid="task-org-visibility-edit"
          >
            Bearbeiten
          </button>
        </div>
      </div>
    );
  }

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("taskId", task.id);
    const visibility = formData.get("visibilityScope") as TaskVisibilityScope | null;
    const orgGrants = formData.get("orgUnitGrantIds");
    if (visibility === "ORG_UNIT" && !(typeof orgGrants === "string" && orgGrants.trim())) {
      setError("Bitte mindestens eine Organisationseinheit wählen.");
      return;
    }
    startTransition(async () => {
      const result = await updateAufgabeOrgVisibilityAction(formData);
      if (result.ok) {
        setEditing(false);
        router.refresh();
        return;
      }
      setError(result.message ?? "Speichern fehlgeschlagen.");
    });
  }

  return (
    <form action={onSubmit} className="space-y-3 rounded-lg border border-[var(--border)]/70 p-3">
      <TaskOrgVisibilityFields
        orgUnitOptions={orgUnitOptions}
        defaultOrgUnitId={task.orgUnitId}
        defaultOrgUnitGrantIds={[...accessGrants.orgUnitIds]}
        defaultViewerUserGrantIds={[...accessGrants.viewerUserIds]}
        defaultVisibilityScope={task.visibilityScope}
        disabled={pending}
        showSectionHeading={false}
      />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="fca-button-primary text-xs" disabled={pending}>
          Speichern
        </button>
        <button
          type="button"
          className="fca-button-secondary text-xs"
          disabled={pending}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
