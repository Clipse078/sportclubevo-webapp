"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type InitiativePick = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

type Props = {
  excludeInitiativeIds?: readonly string[];
  disabled?: boolean;
  onSelect: (initiative: InitiativePick) => void;
  testId?: string;
};

const MIN_QUERY_LENGTH = 2;

export default function ClubDevelopmentInitiativeSearchPicker({
  excludeInitiativeIds = [],
  disabled = false,
  onSelect,
  testId = "club-development-initiative-search-picker",
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InitiativePick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "12" });
        const res = await fetch(`/api/club-development/initiatives/candidates?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Suche fehlgeschlagen.");
          setResults([]);
          return;
        }
        const exclude = new Set(excludeInitiativeIds);
        setResults(
          ((data.initiatives ?? []) as InitiativePick[]).filter((i) => !exclude.has(i.id)),
        );
        setOpen(true);
      } catch {
        setError("Netzwerkfehler.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(handle);
  }, [excludeInitiativeIds, query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-[14rem] flex-1" data-testid={testId}>
      <label className="sr-only" htmlFor={listboxId}>
        Vorhaben suchen
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          id={listboxId}
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Vorhaben suchen …"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-9 text-sm"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      {open && query.trim().length >= MIN_QUERY_LENGTH && !loading ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--muted)]">Keine Vorhaben gefunden.</li>
          ) : (
            results.map((initiative) => (
              <li key={initiative.id}>
                <button
                  type="button"
                  role="option"
                  onClick={() => {
                    onSelect(initiative);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left hover:bg-[var(--surface-2)]"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{initiative.title}</p>
                  <p className="text-xs text-[var(--muted)]">{initiative.status}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}