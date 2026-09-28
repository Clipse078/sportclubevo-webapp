"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

type FieldDto = {
  key: string;
  label: string;
  category: string;
  description: string;
  availability: string;
  implemented: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  RECIPIENT: "Empfänger",
  PLAYER_PARENT: "Spieler & Eltern",
  TEAM: "Team",
  ORGANISATION: "Verein & Organisation",
  SEASON: "Saison",
  EVENT: "Event",
  LOCATION: "Ort & Anlage",
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  PARTICIPATION: "Teilnahme",
  SENDER: "Absender",
  DATE: "Datum",
  LINKS: "Links",
};

type Props = {
  contextRef: CommunicationContextRef;
  onInsert: (token: string) => void;
  disabled?: boolean;
};

export function PersonalisationFieldInsert({ contextRef, onInsert, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("contextKind", contextRef.kind);
    if (contextRef.kind === "TEAM") params.set("teamId", contextRef.teamId);
    if (contextRef.kind === "ORG_UNIT") params.set("orgUnitId", contextRef.orgUnitId);
    if (contextRef.kind === "EVENT") params.set("eventId", contextRef.eventId);

    void fetch(`/api/communication/personalisation/fields?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Felder konnten nicht geladen werden.");
        if (!cancelled) setFields(data.fields ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, contextRef]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => {
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    });
  }, [fields, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, FieldDto[]>();
    for (const field of filtered) {
      const list = map.get(field.category) ?? [];
      list.push(field);
      map.set(field.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium"
      >
        Feld einfügen
      </button>
      {open ? (
        <div className="absolute z-20 mt-2 w-[min(420px,90vw)] rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 shadow-lg">
          <input
            className="mb-2 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
            placeholder="Suchen… z.B. Vorname"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {loading ? <p className="text-sm text-[var(--muted-foreground)]">Lade Felder…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="max-h-64 overflow-y-auto text-sm">
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category} className="mb-3">
                <p className="mb-1 font-semibold text-[var(--foreground)]">
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <ul className="space-y-1">
                  {items.map((field) => (
                    <li key={field.key}>
                      <button
                        type="button"
                        disabled={!field.implemented || field.availability === "UNAVAILABLE"}
                        className="w-full rounded px-2 py-1 text-left hover:bg-[var(--muted)] disabled:opacity-50"
                        title={
                          field.availability !== "AVAILABLE"
                            ? `${field.description} (${field.availability})`
                            : field.description
                        }
                        onClick={() => {
                          onInsert(`<${field.key}>`);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <span className="font-medium">{field.label}</span>
                        <span className="ml-2 font-mono text-xs text-[var(--muted-foreground)]">
                          &lt;{field.key}&gt;
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
