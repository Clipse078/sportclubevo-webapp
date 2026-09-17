"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantMatchOperationalPolicyResolved } from "@/lib/match/tenant-operational-policy-service";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "@/lib/match/defaults";

type Props = {
  initialPolicy: TenantMatchOperationalPolicyResolved;
  canManage: boolean;
};

export default function MatchOperationalPolicyPanel({ initialPolicy, canManage }: Props) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(initialPolicy.defaultMatchDurationMinutes);
  const [savedMinutes, setSavedMinutes] = useState(initialPolicy.defaultMatchDurationMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = useMemo(() => minutes === savedMinutes, [minutes, savedMinutes]);

  async function save() {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/match-operational-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultMatchDurationMinutes: minutes }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        policy?: TenantMatchOperationalPolicyResolved;
      };
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      const next = data.policy?.defaultMatchDurationMinutes ?? minutes;
      setMinutes(next);
      setSavedMinutes(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-[var(--border)]/80 bg-[var(--surface)] px-3 py-2.5"
      data-testid="match-operational-policy"
    >
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Spiele</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <label className="fca-label block text-[var(--text-2)]" htmlFor="match-default-duration">
            Standarddauer
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="match-default-duration"
              type="number"
              min={1}
              max={480}
              className="fca-input w-24 py-1.5 text-right text-sm"
              disabled={!canManage}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              data-testid="match-default-duration-minutes"
            />
            <span className="text-sm text-[var(--muted)]">Min.</span>
          </div>
          <p className="mt-1.5 max-w-md text-xs text-[var(--muted)]">
            Wird verwendet, wenn eine externe Datenquelle keine gültige Endzeit liefert.
          </p>
          {!initialPolicy.isClubConfigured ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Aktuell Plattform-Standard ({SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES} Min.).
            </p>
          ) : null}
        </div>
        {canManage ? (
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md bg-[var(--sce-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            disabled={saving || unchanged}
            onClick={() => void save()}
            data-testid="match-default-duration-save"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
