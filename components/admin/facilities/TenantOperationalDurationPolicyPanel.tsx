"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OperationalDurationKind } from "@/lib/operational/defaults";
import type { TenantOperationalDurationPolicyResolved } from "@/lib/operational/tenant-operational-duration-policy-service";

type Props = {
  initialPolicy: TenantOperationalDurationPolicyResolved;
  canManage: boolean;
};

const ROWS: { kind: OperationalDurationKind; label: string; inputId: string }[] = [
  { kind: "MATCH", label: "Spiele", inputId: "match-default-duration" },
  { kind: "TRAINING", label: "Trainings", inputId: "training-default-duration" },
  { kind: "TOURNAMENT", label: "Turniere", inputId: "tournament-default-duration" },
];

function sourceLabel(isClubConfigured: boolean): string {
  return isClubConfigured ? "Clubstandard" : "Plattform-Standard";
}

export default function TenantOperationalDurationPolicyPanel({ initialPolicy, canManage }: Props) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initialPolicy);
  const [savedPolicy, setSavedPolicy] = useState(initialPolicy);
  const [draft, setDraft] = useState({
    MATCH: initialPolicy.MATCH.durationMinutes,
    TRAINING: initialPolicy.TRAINING.durationMinutes,
    TOURNAMENT: initialPolicy.TOURNAMENT.durationMinutes,
  });
  const [savedDraft, setSavedDraft] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = useMemo(
    () =>
      draft.MATCH === savedDraft.MATCH &&
      draft.TRAINING === savedDraft.TRAINING &&
      draft.TOURNAMENT === savedDraft.TOURNAMENT,
    [draft, savedDraft],
  );

  async function save() {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/operational-duration-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultMatchDurationMinutes: draft.MATCH,
          defaultTrainingDurationMinutes: draft.TRAINING,
          defaultTournamentDurationMinutes: draft.TOURNAMENT,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        policy?: TenantOperationalDurationPolicyResolved;
      };
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      const nextPolicy = data.policy ?? policy;
      const nextDraft = {
        MATCH: nextPolicy.MATCH.durationMinutes,
        TRAINING: nextPolicy.TRAINING.durationMinutes,
        TOURNAMENT: nextPolicy.TOURNAMENT.durationMinutes,
      };
      setPolicy(nextPolicy);
      setSavedPolicy(nextPolicy);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-[var(--border)]/80 bg-[var(--surface)] px-4 py-3"
      data-testid="tenant-operational-duration-policy"
    >
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Zeitstandards</h2>
      <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
        Standarddauer — legt fest, wie lange Einträge ohne gültige Endzeit standardmässig
        eingeplant werden.
      </p>

      <div className="mt-4 space-y-3">
        {ROWS.map(({ kind, label, inputId }) => (
          <div
            key={kind}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[8rem_minmax(0,6rem)_auto_1fr]"
          >
            <label className="text-sm text-[var(--foreground)]" htmlFor={inputId}>
              {label}
            </label>
            <div className="flex items-center gap-2 sm:col-start-2">
              <input
                id={inputId}
                type="number"
                min={1}
                max={480}
                className="fca-input w-full py-1.5 text-right text-sm"
                disabled={!canManage}
                value={draft[kind]}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [kind]: Number(e.target.value) }))
                }
                data-testid={`${kind.toLowerCase()}-default-duration-minutes`}
              />
              <span className="shrink-0 text-sm text-[var(--muted)]">Min.</span>
            </div>
            <p className="text-xs text-[var(--muted)] sm:col-start-3">
              {sourceLabel(savedPolicy[kind].isClubConfigured)}
            </p>
          </div>
        ))}
      </div>

      {canManage ? (
        <div className="mt-4 flex justify-end border-t border-[var(--border)]/60 pt-3">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md bg-[var(--sce-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            disabled={saving || unchanged}
            onClick={() => void save()}
            data-testid="operational-duration-policy-save"
          >
            {saving ? "Speichern…" : "Änderungen speichern"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
