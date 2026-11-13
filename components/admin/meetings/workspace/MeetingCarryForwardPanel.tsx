"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import type { CarryForwardEligibleItem, CarryForwardSourceType } from "@/lib/meetings/meeting-carry-forward";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "./meetingWorkspaceFieldClasses";

type Props = {
  meetingId: string;
  canManage: boolean;
  onApplied: () => void;
};

function formatMeetingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function MeetingCarryForwardPanel({ meetingId, canManage, onApplied }: Props) {
  const [items, setItems] = useState<CarryForwardEligibleItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/carry-forward`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Laden fehlgeschlagen.");
      setItems(Array.isArray(data.items) ? data.items : []);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  function toggle(item: CarryForwardEligibleItem) {
    if (item.sourceType === "ACTION_OPEN") return;
    const key = item.key;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applySelected() {
    const picks = items.filter(
      (i) => selected.has(i.key) && i.sourceType !== "ACTION_OPEN",
    );
    if (picks.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const selections = picks.map((p) => ({
          sourceType: p.sourceType as CarryForwardSourceType,
          sourceAgendaItemId: p.sourceAgendaItemId,
          sourceTaskId: p.sourceTaskId,
          sourceActionId: p.sourceActionId,
        }));
        const res = await fetch(`/api/meetings/${meetingId}/carry-forward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selections }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Übernahme fehlgeschlagen.");
        await load();
        onApplied();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  if (!canManage) return null;

  return (
    <SceExpandablePanel
      defaultOpen={false}
      summary={
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <ChevronDown className="h-4 w-4 text-[#0b4aa2]" aria-hidden />
          Offene Themen aus früheren Sitzungen
        </span>
      }
    >
      <div className="space-y-3" data-testid="meeting-carry-forward-panel">
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">Keine übernehmbaren offenen Punkte gefunden.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="flex items-start gap-3">
                  <SwitchThumb
                    id={`carry-fwd-${item.key}`}
                    checked={selected.has(item.key)}
                    onChange={() => toggle(item)}
                    disabled={item.sourceType === "ACTION_OPEN"}
                    aria-label={`${item.title} zur Übernahme auswählen`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--foreground)]">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-2)]">
                      {item.sourceMeetingTitle} · {formatMeetingDate(item.sourceMeetingDate)} · {item.statusLabel}
                      {item.sourceType === "TASK_OPEN"
                        ? " · Aufgabe"
                        : item.sourceType === "ACTION_OPEN"
                          ? " · Massnahme (nur Anzeige)"
                          : " · Traktandum"}
                    </span>
                    {item.ownerLabel ? (
                      <span className="block text-xs text-[var(--muted)]">Verantwortlich: {item.ownerLabel}</span>
                    ) : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            className={workspacePrimaryButtonClass}
            disabled={pending || selected.size === 0}
            onClick={applySelected}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="ml-1">Übernehmen</span>
          </button>
          <button type="button" className={workspaceGhostButtonClass} disabled={loading || pending} onClick={() => void load()}>
            Aktualisieren
          </button>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          Beschlüsse werden in diesem Paket nicht automatisch zurückgestellt. Offene Traktanden werden verknüpft
          kopiert; offene Aufgaben werden dem Sitzungskontext zugeordnet (ohne Duplikat). Offene Massnahmen aus
          früheren Sitzungen sind hier nur zur Vorbereitung sichtbar — dauerhafte Nachverfolgung erfordert die
          Migration «MeetingCommitmentReview» (SCE-MTG-PEND-01-SCHEMA-GAPS).
        </p>
      </div>
    </SceExpandablePanel>
  );
}
