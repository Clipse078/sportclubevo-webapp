"use client";

import { useMemo, useState } from "react";
import { resolveDressingRoomOccupancy } from "@/lib/dressing-room-occupancy/resolver";
import type { DressingRoomOccupancyActivityType } from "@/lib/dressing-room-occupancy/types";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerItem;
  activityType: DressingRoomOccupancyActivityType;
  activityId: string;
  tenantPresets: {
    training: { beforeMinutes: number; afterMinutes: number };
    match: { beforeMinutes: number; afterMinutes: number };
    tournament: { beforeMinutes: number; afterMinutes: number };
  };
  onSaved: () => void;
};

export default function DressingRoomOccupancyEditor({
  item,
  activityType,
  activityId,
  tenantPresets,
  onSaved,
}: Props) {
  const activityPreset =
    activityType === "TRAINING"
      ? tenantPresets.training
      : activityType === "MATCH"
        ? tenantPresets.match
        : tenantPresets.tournament;

  const [mode, setMode] = useState(item.dressingRoomOccupancyMode);
  const [beforeMinutes, setBeforeMinutes] = useState(
    item.dressingRoomOccupancyBeforeMinutes ?? activityPreset.beforeMinutes,
  );
  const [afterMinutes, setAfterMinutes] = useState(
    item.dressingRoomOccupancyAfterMinutes ?? activityPreset.afterMinutes,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      resolveDressingRoomOccupancy({
        activityType,
        activityStart: item.startAt,
        activityEnd: item.endAt,
        tenantPresets,
        eventOverride: {
          mode,
          beforeMinutes: mode === "CUSTOM" ? beforeMinutes : null,
          afterMinutes: mode === "CUSTOM" ? afterMinutes : null,
        },
      }),
    [activityType, item.startAt, item.endAt, tenantPresets, mode, beforeMinutes, afterMinutes],
  );

  const preset =
    activityType === "TRAINING"
      ? tenantPresets.training
      : activityType === "MATCH"
        ? tenantPresets.match
        : tenantPresets.tournament;

  async function save() {
    setSaving(true);
    setError(null);
    const endpoint =
      item.type === "TRAINING"
        ? `/api/training-sessions/${activityId}/dressing-room-occupancy`
        : item.type === "TOURNAMENT"
          ? `/api/tournaments/${activityId}`
          : `/api/matchcenter/${activityId}`;
    const body =
      item.type === "TRAINING"
        ? { mode, beforeMinutes: mode === "CUSTOM" ? beforeMinutes : null, afterMinutes: mode === "CUSTOM" ? afterMinutes : null }
        : {
            dressingRoomOccupancyMode: mode,
            dressingRoomBeforeMinutes: mode === "CUSTOM" ? beforeMinutes : null,
            dressingRoomAfterMinutes: mode === "CUSTOM" ? afterMinutes : null,
          };

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const fmt = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] p-3" data-testid="dressing-room-occupancy-editor">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Belegungszeit Garderobe</p>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="radio"
          checked={mode === "DEFAULT"}
          onChange={() => setMode("DEFAULT")}
        />
        Vereinsstandard · {preset.beforeMinutes} Min. vorher · {preset.afterMinutes} Min. nachher
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input type="radio" checked={mode === "CUSTOM"} onChange={() => setMode("CUSTOM")} />
        Individuell
      </label>

      {mode === "CUSTOM" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Vorher (Min.)
            <input
              type="number"
              className="fca-input mt-1"
              value={beforeMinutes}
              onChange={(e) => setBeforeMinutes(Number(e.target.value))}
            />
          </label>
          <label className="text-xs">
            Nachher (Min.)
            <input
              type="number"
              className="fca-input mt-1"
              value={afterMinutes}
              onChange={(e) => setAfterMinutes(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <p className="text-xs text-[var(--text-2)]">
        Effektive Belegung {fmt.format(preview.effectiveStart)}–{fmt.format(preview.effectiveEnd)}
      </p>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <button
        type="button"
        className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--surface-2)] disabled:opacity-50"
        onClick={save}
        disabled={saving}
      >
        Belegungszeit speichern
      </button>
    </div>
  );
}
