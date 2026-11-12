"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { PersonPickerResult } from "@/components/shared/PeoplePicker";

export type SceInlineMultiPersonChip = {
  id: string;
  label: string;
  description?: string | null;
};

type Props = {
  label?: string;
  hideLabel?: boolean;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onSelectionKnown?: (entries: SceInlineMultiPersonChip[]) => void;
  knownById?: Map<string, SceInlineMultiPersonChip>;
  disabled?: boolean;
  placeholder?: string;
  testIdPrefix?: string;
};

function getPersonLabel(p: PersonPickerResult): string {
  return p.displayName || `${p.firstName} ${p.lastName}`.trim();
}

function PersonAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--blue)]"
    >
      {initials || "?"}
    </div>
  );
}

export function SceInlineMultiPersonPicker({
  label = "Teilnehmer",
  hideLabel = false,
  selectedIds,
  onSelectedIdsChange,
  onSelectionKnown,
  knownById,
  disabled = false,
  placeholder = "Person im Verein suchen…",
  testIdPrefix = "sce-inline-multi-person-picker",
}: Props) {
  const instanceId = useId();
  const listboxId = `sce-inline-multi-listbox-${instanceId}`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonPickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const excludeRef = useRef(selectedIds);
  excludeRef.current = selectedIds;

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setError(null);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/people/search?q=${encodeURIComponent(query.trim())}&mode=any`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Personensuche fehlgeschlagen.");

        const all = Array.isArray(data) ? (data as PersonPickerResult[]) : [];
        const filtered = all.filter((p) => !excludeRef.current.includes(p.id));

        setResults(filtered);
        setOpen(filtered.length > 0);
        setFocusedIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler bei der Suche.");
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function addPerson(person: PersonPickerResult) {
    if (selectedIds.includes(person.id)) return;
    const label = getPersonLabel(person);
    const nextIds = [...selectedIds, person.id];
    onSelectedIdsChange(nextIds);
    onSelectionKnown?.([
      {
        id: person.id,
        label,
        description: person.email ?? person.phone,
      },
    ]);
    setQuery("");
    setResults([]);
    setOpen(false);
    setFocusedIndex(0);
    inputRef.current?.focus();
  }

  function removeId(id: string) {
    onSelectedIdsChange(selectedIds.filter((x) => x !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open && results.length > 0) setOpen(true);
        else setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (open && results[focusedIndex]) addPerson(results[focusedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        setResults([]);
        break;
    }
  }

  return (
    <div className="space-y-1.5" data-testid={testIdPrefix}>
      {hideLabel || !label ? null : (
        <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
      )}
      <div ref={containerRef} className="relative w-full">
        {selectedIds.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5" data-testid={`${testIdPrefix}-chips`}>
            {selectedIds.map((id) => {
              const known = knownById?.get(id);
              const chipLabel = known?.label ?? id;
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-2 pr-1 py-0.5 text-xs text-[var(--text-2)]"
                  data-testid={`${testIdPrefix}-chip-${id}`}
                >
                  <span className="truncate">{chipLabel}</span>
                  {disabled ? null : (
                    <button
                      type="button"
                      className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                      aria-label={`${chipLabel} entfernen`}
                      onClick={() => removeId(id)}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        ) : null}

        <div
          className={`sce-page-search${disabled ? " pointer-events-none opacity-50" : ""}`}
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[var(--muted)]" />
          ) : (
            <Search className="h-4 w-4 flex-shrink-0 text-[var(--muted)]" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            role="combobox"
            data-testid={`${testIdPrefix}-search`}
          />
          {query.length > 0 ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setQuery("");
                setResults([]);
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-slate-200"
              aria-label="Suche leeren"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {!loading && query.length > 0 && query.length < 2 ? (
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">Mindestens 2 Zeichen eingeben.</p>
        ) : null}
        {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}
        {!loading && !error && !open && query.trim().length >= 2 && results.length === 0 ? (
          <p className="mt-1.5 text-xs italic text-[var(--muted)]">Keine Personen gefunden.</p>
        ) : null}

        {open && results.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]"
          >
            {results.map((person, index) => {
              const personLabel = getPersonLabel(person);
              const subtitle = person.email || person.phone || null;
              const isFocused = index === focusedIndex;
              return (
                <li key={person.id} role="option" aria-selected={isFocused}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addPerson(person);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors${
                      isFocused ? " bg-[var(--surface-2)]" : " hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <PersonAvatar name={personLabel} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{personLabel}</p>
                      {subtitle ? (
                        <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
