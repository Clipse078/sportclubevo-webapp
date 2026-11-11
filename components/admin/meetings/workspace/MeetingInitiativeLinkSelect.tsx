"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { workspaceInputClass } from "./meetingWorkspaceFieldClasses";

export type InitiativeLinkOption = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

type Props = {
  value: InitiativeLinkOption | null;
  onChange: (next: InitiativeLinkOption | null) => void;
  disabled?: boolean;
};

export function MeetingInitiativeLinkSelect({ value, onChange, disabled }: Props) {
  const [options, setOptions] = useState<InitiativeLinkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/initiatives");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Vorhaben konnten nicht geladen werden.");
        const list = Array.isArray(data.initiatives) ? data.initiatives : [];
        if (!cancelled) {
          setOptions(
            list.map((row: { id: string; slug: string; title: string; status: string }) => ({
              id: row.id,
              slug: row.slug,
              title: row.title,
              status: row.status,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options.filter((o) => o.title.toLowerCase().includes(q)).slice(0, 12);
  }, [options, query]);

  if (value) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Verknüpftes Vorhaben</p>
            <Link
              href={`/vereinsleitung/initiativen/${value.slug}`}
              className="text-sm font-semibold text-[#0b4aa2] hover:underline"
            >
              {value.title}
            </Link>
            <p className="text-xs text-[var(--text-2)]">Status: {value.status}</p>
          </div>
          {disabled ? null : (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold"
              onClick={() => onChange(null)}
            >
              <X className="h-3.5 w-3.5" />
              Entfernen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Vorhaben verknüpfen (optional)</label>
      {error ? <p className="mb-2 text-xs text-rose-700">{error}</p> : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          className={`${workspaceInputClass} pl-9`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Vorhaben suchen…"
          disabled={disabled || loading}
        />
        {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" /> : null}
      </div>
      {filtered.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface-2)]"
                disabled={disabled}
                onClick={() => onChange(option)}
              >
                <span className="text-sm font-medium text-[var(--foreground)]">{option.title}</span>
                <span className="text-[11px] text-[var(--text-2)]">{option.status}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
