"use client";

import { useCallback, useMemo, useState, useTransition, type FormEventHandler } from "react";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";
import ClubStrategyOrgUnitScopePicker from "./ClubStrategyOrgUnitScopePicker";

export type StrategieNeuFormProps = {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  onCancel: () => void;
  onSuccess: (strategyId: string) => void;
  submitLabel?: string;
  pendingLabel?: string;
};

export function useStrategieNeuDirtyGuard(formSnapshot: { title: string; orgUnitIds: string[] }) {
  return useSceComposerFormDirty(formSnapshot);
}

export default function StrategieNeuForm({
  orgUnitOptions,
  onCancel,
  onSuccess,
  submitLabel = "Strategie anlegen",
  pendingLabel = "Speichern…",
}: StrategieNeuFormProps) {
  const [title, setTitle] = useState("");
  const [orgUnitIds, setOrgUnitIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const formSnapshot = useMemo(() => ({ title, orgUnitIds }), [title, orgUnitIds]);
  useSceComposerFormDirty(formSnapshot);

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (!title.trim()) {
        setError("Bitte einen Titel eingeben.");
        return;
      }
      setError(null);
      startTransition(async () => {
        const result = await clubDevelopmentFetchJson<{ id: string }>("/api/club-development/club-strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), orgUnitIds }),
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSuccess(result.data.id);
      });
    },
    [onSuccess, orgUnitIds, title],
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
        selectedOrgUnitIds={orgUnitIds}
        onSelectedOrgUnitIdsChange={setOrgUnitIds}
        disabled={pending}
      />
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