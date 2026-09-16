"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";

type Props = {
  initialPresets: TenantDressingRoomOccupancyPresets;
  canManage: boolean;
};

export default function DressingRoomOccupancyPresetsPanel({ initialPresets, canManage }: Props) {
  const router = useRouter();
  const [presets, setPresets] = useState(initialPresets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/dressing-room-occupancy-presets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingBeforeMinutes: presets.training.beforeMinutes,
          trainingAfterMinutes: presets.training.afterMinutes,
          matchBeforeMinutes: presets.match.beforeMinutes,
          matchAfterMinutes: presets.match.afterMinutes,
          tournamentBeforeMinutes: presets.tournament.beforeMinutes,
          tournamentAfterMinutes: presets.tournament.afterMinutes,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; presets?: TenantDressingRoomOccupancyPresets };
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      if (data.presets) setPresets(data.presets);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      data-testid="dressing-room-occupancy-presets"
    >
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Garderoben-Belegungszeiten</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Standard-Puffer vor und nach der Aktivität für Trainings, Spiele und Turniere.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(
          [
            ["Training", "training"],
            ["Spiel", "match"],
            ["Turnier", "tournament"],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="space-y-2 rounded-lg border border-[var(--border)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <label className="block text-xs">
              Vorher (Min.)
              <input
                type="number"
                min={0}
                className="fca-input mt-1"
                disabled={!canManage}
                value={presets[key].beforeMinutes}
                onChange={(e) =>
                  setPresets((current) => ({
                    ...current,
                    [key]: { ...current[key], beforeMinutes: Number(e.target.value) },
                  }))
                }
              />
            </label>
            <label className="block text-xs">
              Nachher (Min.)
              <input
                type="number"
                min={0}
                className="fca-input mt-1"
                disabled={!canManage}
                value={presets[key].afterMinutes}
                onChange={(e) =>
                  setPresets((current) => ({
                    ...current,
                    [key]: { ...current[key], afterMinutes: Number(e.target.value) },
                  }))
                }
              />
            </label>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

      {canManage && (
        <button
          type="button"
          className="mt-4 rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          onClick={save}
          disabled={saving}
        >
          Änderungen speichern
        </button>
      )}
    </section>
  );
}
