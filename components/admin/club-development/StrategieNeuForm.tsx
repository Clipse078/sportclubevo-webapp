"use client";

import { useCallback, useMemo, useState, useTransition, type FormEventHandler } from "react";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import {
  defaultClubStrategyOrgScopeSelection,
  parseClubStrategyOrgScopeSelection,
  toCreateClubStrategyScopePayload,
} from "@/lib/club-development/club-strategy-org-scope";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";
import ClubStrategyOrgUnitScopePicker from "./ClubStrategyOrgUnitScopePicker";
import TaskDescriptionFormField from "@/components/admin/aufgaben/TaskDescriptionFormField";
import TaskPeopleMultiPicker from "@/components/admin/aufgaben/TaskPeopleMultiPicker";
import { TaskDeadlineFields } from "@/components/admin/aufgaben/TaskReminderFields";
import { parseTaskDueAtFromForm } from "@/lib/tasks/task-reminder-schedule";

export type StrategieNeuFormProps = {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  onCancel: () => void;
  onSuccess: (strategyId: string) => void;
  submitLabel?: string;
  pendingLabel?: string;
};

export function useStrategieNeuDirtyGuard(formSnapshot: { title: string; orgScope: string[] }) {
  return useSceComposerFormDirty(formSnapshot);
}

export default function StrategieNeuForm({
  orgUnitOptions,
  timeZone,
  onCancel,
  onSuccess,
  submitLabel = "Strategie anlegen",
  pendingLabel = "Speichern…",
}: StrategieNeuFormProps) {
  const [title, setTitle] = useState("");
  const [orgScope, setOrgScope] = useState<string[]>(defaultClubStrategyOrgScopeSelection);
  const [orgScopeTouched, setOrgScopeTouched] = useState(false);
  const [situationText, setSituationText] = useState("");
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fieldsKey] = useState(0);

  const formSnapshot = useMemo(
    () => ({ title, orgScope, situationText, assigneeUserIds }),
    [title, orgScope, situationText, assigneeUserIds],
  );
  useSceComposerFormDirty(formSnapshot);

  const scopeInvalid = parseClubStrategyOrgScopeSelection(orgScope).kind === "invalid";

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (!title.trim()) {
        setError("Bitte einen Titel eingeben.");
        return;
      }
      const scopePayload = toCreateClubStrategyScopePayload(orgScope);
      if (!scopePayload) {
        setOrgScopeTouched(true);
        setError(null);
        return;
      }
      setError(null);
      const form = event.currentTarget;
      const dueAt = parseTaskDueAtFromForm({
        dateRaw: new FormData(form).get("dueAt")?.toString(),
        timeRaw: new FormData(form).get("dueTime")?.toString(),
        timeZone,
      });
      if (dueAt === "invalid") {
        setError("Ungültiges Fälligkeitsdatum.");
        return;
      }

      startTransition(async () => {
        const result = await clubDevelopmentFetchJson<{ id: string }>("/api/club-development/club-strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            ...scopePayload,
            situationText: situationText.trim() || null,
            responsibleUserId: assigneeUserIds[0] ?? null,
            nextReviewAt: dueAt?.toISOString() ?? null,
          }),
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess(result.data.id);
      });
    },
    [assigneeUserIds, onSuccess, orgScope, situationText, timeZone, title],
  );

  return (
    <form className="space-y-4" onSubmit={onSubmit} data-testid="strategie-neu-form">
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--muted)]">Titel</span>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          data-testid="strategie-create-title"
        />
      </label>
      <ClubStrategyOrgUnitScopePicker
        options={orgUnitOptions}
        selectedScope={orgScope}
        onSelectedScopeChange={(next) => {
          setOrgScope(next);
          setOrgScopeTouched(true);
        }}
        disabled={pending}
        showRequiredHint={orgScopeTouched && scopeInvalid}
      />
      <TaskDescriptionFormField
        key={fieldsKey}
        optional
        label="Beschreibung"
        inputId="strategie-neu-description"
        onSerializedChange={setSituationText}
      />
      <TaskPeopleMultiPicker
        label="Verantwortlich"
        fieldName="responsibleUserIds"
        selectedIds={assigneeUserIds}
        onSelectedIdsChange={setAssigneeUserIds}
        disabled={pending}
        testIdPrefix="strategie-neu-responsible"
        omitHiddenField
        allowAdd
      />
      <TaskDeadlineFields timeZone={timeZone} dueAt={null} />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={workspacePrimaryButtonClass}
          disabled={pending}
          data-testid="strategie-create-submit"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        <button
          type="button"
          className={workspaceGhostButtonClass}
          disabled={pending}
          onClick={onCancel}
          data-testid="strategie-create-cancel"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}