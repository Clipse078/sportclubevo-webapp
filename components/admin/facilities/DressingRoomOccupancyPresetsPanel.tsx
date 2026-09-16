"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";

type Props = {
  initialPresets: TenantDressingRoomOccupancyPresets;
  canManage: boolean;
};

const ROWS: { label: string; key: keyof TenantDressingRoomOccupancyPresets }[] = [
  { label: "Training", key: "training" },
  { label: "Spiel", key: "match" },
  { label: "Turnier", key: "tournament" },
];

export default function DressingRoomOccupancyPresetsPanel({ initialPresets, canManage }: Props) {
  const router = useRouter();
  const [presets, setPresets] = useState(initialPresets);
  const [savedBaseline, setSavedBaseline] = useState(initialPresets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = useMemo(
    () => JSON.stringify(presets) === JSON.stringify(savedBaseline),
    [presets, savedBaseline],
  );

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
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        presets?: TenantDressingRoomOccupancyPresets;
      };
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      if (data.presets) {
        setPresets(data.presets);
        setSavedBaseline(data.presets);
      } else {
        setSavedBaseline(presets);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
      data-testid="dressing-room-occupancy-presets"
    >
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Garderoben-Belegungszeiten</h2>
      <p className="mt-0.5 max-w-xl text-xs text-[var(--muted)]">
        Standardzeit, während der eine Garderobe vor und nach einer Aktivität reserviert bleibt.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full max-w-md text-xs">
          <thead>
            <tr className="text-[var(--text-2)]">
              <th className="pb-2 pr-4 text-left font-medium" scope="col" />
              <th className="pb-2 px-2 text-right font-medium" scope="col">Vorher</th>
              <th className="pb-2 pl-2 text-right font-medium" scope="col">Nachher</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label, key }) => (
              <tr key={key} className="border-t border-[var(--border)]/60">
                <th className="py-2 pr-4 text-left font-medium text-[var(--foreground)]" scope="row">
                  {label}
                </th>
                <td className="py-2 px-2 text-right">
                  <label className="inline-flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min={0}
                      aria-label={`${label} Vorher in Minuten`}
                      className="fca-input w-16 py-1 text-right text-xs"
                      disabled={!canManage}
                      value={presets[key].beforeMinutes}
                      onChange={(e) =>
                        setPresets((current) => ({
                          ...current,
                          [key]: { ...current[key], beforeMinutes: Number(e.target.value) },
                        }))
                      }
                    />
                    <span className="text-[var(--muted)]">Min.</span>
                  </label>
                </td>
                <td className="py-2 pl-2 text-right">
                  <label className="inline-flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min={0}
                      aria-label={`${label} Nachher in Minuten`}
                      className="fca-input w-16 py-1 text-right text-xs"
                      disabled={!canManage}
                      value={presets[key].afterMinutes}
                      onChange={(e) =>
                        setPresets((current) => ({
                          ...current,
                          [key]: { ...current[key], afterMinutes: Number(e.target.value) },
                        }))
                      }
                    />
                    <span className="text-[var(--muted)]">Min.</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600" role="alert">{error}</p>}

      {canManage && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            onClick={save}
            disabled={saving || unchanged}
          >
            {saving ? "Speichern…" : "Änderungen speichern"}
          </button>
        </div>
      )}
    </section>
  );
}
