"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type ClubDevelopmentTaskPick = {
  id: string;
  title: string;
  statusLabel: string;
  assigneeLabels: string[];
  initiativeTitle: string | null;
  contextLabel: string | null;
};

type Props = {
  excludeTaskIds?: readonly string[];
  disabled?: boolean;
  onSelect: (task: ClubDevelopmentTaskPick) => void;
  placeholder?: string;
  testId?: string;
};

const MIN_QUERY_LENGTH = 2;

export default function ClubDevelopmentTaskSearchPicker({
  excludeTaskIds = [],
  disabled = false,
  onSelect,
  placeholder = "Aufgabe suchen …",
  testId = "club-development-task-search-picker",
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubDevelopmentTaskPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "15" });
        if (excludeTaskIds.length > 0) {
          params.set("exclude", excludeTaskIds.join(","));
        }
        const res = await fetch(`/api/club-development/task-candidates?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Suche fehlgeschlagen.");
          setResults([]);
          return;
        }
        setResults((data.tasks ?? []) as ClubDevelopmentTaskPick[]);
        setOpen(true);
      } catch {
        setError("Netzwerkfehler bei der Aufgabensuche.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(handle);
  }, [excludeTaskIds, query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (task: ClubDevelopmentTaskPick) => {
    onSelect(task);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-[14rem] flex-1" data-testid={testId}>
      <label className="sr-only" htmlFor={`${listboxId}-input`}>
        Aufgabe suchen
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          id={`${listboxId}-input`}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-9 text-sm disabled:opacity-60"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {open && query.trim().length >= MIN_QUERY_LENGTH && !loading ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--muted)]">Keine passenden Aufgaben.</li>
          ) : (
            results.map((task) => (
              <li key={task.id} role="option">
                <button
                  type="button"
                  onClick={() => pick(task)}
                  className="w-full px-3 py-2.5 text-left hover:bg-[var(--surface-2)]"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {task.statusLabel}
                    {task.assigneeLabels.length > 0 ? ` · ${task.assigneeLabels.join(", ")}` : ""}
                    {task.initiativeTitle ? ` · Vorhaben: ${task.initiativeTitle}` : ""}
                    {task.contextLabel && !task.initiativeTitle ? ` · ${task.contextLabel}` : ""}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH ? (
        <p className="mt-1 text-xs text-[var(--muted)]">Mindestens {MIN_QUERY_LENGTH} Zeichen eingeben.</p>
      ) : null}
    </div>
  );
}