"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import type { PendenzListFilter, PendenzListItem } from "@/lib/meetings/meeting-pendenzen";
import { filterPendenzen } from "@/lib/meetings/meeting-pendenzen";

type SerializedPendenz = Omit<PendenzListItem, "meetingDate" | "deadline"> & {
  meetingDate: string;
  deadline: string | null;
};

type Props = {
  meetingId: string;
  refreshToken?: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function PendenzRow({ item }: { item: PendenzListItem }) {
  const statusClass = item.isOverdue ? "text-amber-800" : "text-[var(--text-2)]";
  return (
    <SceExpandablePanel
      defaultOpen={false}
      summary={
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-[var(--foreground)]">{item.title}</span>
          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {item.sourceKind === "MASSNAHME" ? "Massnahme" : "Aufgabe"}
          </span>
          <span className={`text-xs ${statusClass}`}>
            {item.statusLabel}
            {item.isOverdue ? " · Überfällig" : ""}
          </span>
          {item.ownerLabel ? <span className="text-xs text-[var(--text-2)]">{item.ownerLabel}</span> : null}
          <span className="text-xs text-[var(--text-2)]">
            Fällig: {item.deadline ? formatDate(item.deadline.toISOString()) : "—"}
          </span>
        </div>
      }
    >
      <div className="space-y-2 pt-2 text-sm text-[var(--text-2)]">
        {item.description ? (
          <p>
            <span className="font-semibold text-[var(--muted)]">Beschreibung: </span>
            {item.description}
          </p>
        ) : null}
        {item.expectedOutcome ? (
          <p>
            <span className="font-semibold text-[var(--muted)]">Erwartetes Ergebnis: </span>
            {item.expectedOutcome}
          </p>
        ) : null}
        {item.contextReference ? (
          <p>
            <span className="font-semibold text-[var(--muted)]">Bezug: </span>
            {item.contextReference}
          </p>
        ) : null}
        <p className="text-xs text-[var(--muted)]">
          Ursprung: {item.meetingTitle} ({formatDate(item.meetingDate.toISOString())})
        </p>
      </div>
    </SceExpandablePanel>
  );
}

export default function MeetingPendenzenPanel({ meetingId, refreshToken = 0 }: Props) {
  const [items, setItems] = useState<SerializedPendenz[]>([]);
  const [filter, setFilter] = useState<PendenzListFilter>("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/pendenzen`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Laden fehlgeschlagen");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const filtered = useMemo(() => {
    const deserialized = items.map((i) => ({
      ...i,
      meetingDate: new Date(i.meetingDate),
      deadline: i.deadline ? new Date(i.deadline) : null,
    }));
    return filterPendenzen(deserialized, filter);
  }, [items, filter]);

  const massnahmen = filtered.filter((i) => i.sourceKind === "MASSNAHME");
  const aufgaben = filtered.filter((i) => i.sourceKind === "AUFGABE");

  return (
    <section
      id="meeting-section-pendenzen"
      className="space-y-3"
      data-testid="meeting-section-pendenzen"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Pendenzen</h2>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-medium ${filter === "open" ? "bg-[#0b4aa2] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
            onClick={() => setFilter("open")}
          >
            Offen
          </button>
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-medium ${filter === "all" ? "bg-[#0b4aa2] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
            onClick={() => setFilter("all")}
          >
            Alle
          </button>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Pendenzen werden geladen…
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Keine Pendenzen für den gewählten Filter.</p>
      ) : null}

      {massnahmen.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <ChevronDown className="h-3 w-3" aria-hidden />
            Massnahmen ({massnahmen.length})
          </p>
          {massnahmen.map((row) => (
            <PendenzRow key={row.dedupeKey} item={row} />
          ))}
        </div>
      ) : null}

      {aufgaben.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <ChevronDown className="h-3 w-3" aria-hidden />
            Aufgaben ({aufgaben.length})
          </p>
          {aufgaben.map((row) => (
            <PendenzRow key={row.dedupeKey} item={row} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
