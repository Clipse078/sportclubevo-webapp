"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type TargetPick = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  excludeTargetIds?: readonly string[];
  disabled?: boolean;
  onSelect: (target: TargetPick) => void;
  testId?: string;
};

const MIN_QUERY_LENGTH = 2;

export default function ClubDevelopmentTargetSearchPicker({
  excludeTargetIds = [],
  disabled = false,
  onSelect,
  testId = "club-development-target-search-picker",
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TargetPick[]>([]);
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
        const res = await fetch(`/api/club-development/targets/candidates?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Suche fehlgeschlagen.");
          setResults([]);
          return;
        }
        const exclude = new Set(excludeTargetIds);
        setResults(((data.targets ?? []) as TargetPick[]).filter((t) => !exclude.has(t.id)));
        setOpen(true);
      } catch {
        setError("Netzwerkfehler.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(handle);
  }, [excludeTargetIds, query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-[14rem] flex-1" data-testid={testId}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Strategisches Ziel suchen …"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-9 text-sm"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      {open && query.trim().length >= MIN_QUERY_LENGTH && !loading ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--muted)]">Keine Ziele gefunden.</li>
          ) : (
            results.map((target) => (
              <li key={target.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(target);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left hover:bg-[var(--surface-2)]"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{target.title}</p>
                  <p className="text-xs text-[var(--muted)]">{target.status}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}