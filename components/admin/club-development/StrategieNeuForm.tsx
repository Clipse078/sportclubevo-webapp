"use client";

import { useCallback, useMemo, useState, useTransition, type FormEventHandler } from "react";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

export type StrategieNeuFormProps = {
  orgUnitOptions: { id: string; name: string }[];
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

  const toggleOrgUnit = (orgUnitId: string) => {
    setOrgUnitIds((prev) =>
      prev.includes(orgUnitId) ? prev.filter((id) => id !== orgUnitId) : [...prev, orgUnitId],
    );
  };

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
      {orgUnitOptions.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs text-[var(--muted)]">Org-Einheiten (optional, mehrfach)</legend>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
            {orgUnitOptions.map((unit) => {
              const selected = orgUnitIds.includes(unit.id);
              return (
                <li key={unit.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={`w-full rounded-md border px-2 py-1 text-left text-sm ${
                      selected
                        ? "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]"
                        : "border-[var(--border)] text-[var(--foreground)]"
                    }`}
                    onClick={() => toggleOrgUnit(unit.id)}
                  >
                    {unit.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
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