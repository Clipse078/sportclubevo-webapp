"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import { SCE_SELECTOR_MIN_SEARCH_LENGTH } from "@/lib/sce/list-selector/sources/constants";
import { fetchWithSceSelectorTimeout } from "@/lib/sce/list-selector/fetch-with-timeout";
import { sceSelectorDiscoverErrorForHttpStatus } from "@/lib/sce/list-selector/selector-discover-api-errors";

export type SceInlineTaskAssigneeChip = {
  userId: string;
  personId: string;
  label: string;
  description?: string | null;
};

type Props = {
  label?: string;
  hideLabel?: boolean;
  fieldName?: string;
  form?: string;
  omitHiddenField?: boolean;
  selectedUserIds: string[];
  onSelectedUserIdsChange: (userIds: string[]) => void;
  onSelectionKnown?: (entries: SceInlineTaskAssigneeChip[]) => void;
  knownByUserId?: Map<string, SceInlineTaskAssigneeChip>;
  disabled?: boolean;
  lockedUserIds?: readonly string[];
  allowAdd?: boolean;
  placeholder?: string;
  testIdPrefix?: string;
};

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
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[0.65rem] font-bold uppercase tracking-wide text-[var(--blue)]"
    >
      {initials || "?"}
    </div>
  );
}

function linkedUserIdFromItem(item: SceSelectorItem): string | null {
  const linked = item.metadata?.linkedUserId;
  return typeof linked === "string" && linked.length > 0 ? linked : null;
}

export function SceInlineTaskAssigneeMultiPicker({
  label = "Verantwortlich",
  hideLabel = false,
  fieldName,
  form,
  omitHiddenField = false,
  selectedUserIds,
  onSelectedUserIdsChange,
  onSelectionKnown,
  knownByUserId,
  disabled = false,
  lockedUserIds = [],
  allowAdd = true,
  placeholder = "Personen suchen …",
  testIdPrefix = "sce-inline-task-assignee-picker",
}: Props) {
  const instanceId = useId();
  const listboxId = `sce-inline-task-assignee-listbox-${instanceId}`;
  const locked = useMemo(() => new Set(lockedUserIds), [lockedUserIds]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SceSelectorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedRef = useRef(selectedUserIds);
  selectedRef.current = selectedUserIds;

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setError(null);

    if (query.trim().length < SCE_SELECTOR_MIN_SEARCH_LENGTH) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const excludeParam =
          selectedRef.current.length > 0
            ? `&excludeUserIds=${encodeURIComponent(selectedRef.current.join(","))}`
            : "";
        const url = `/api/sce/selector/discover?authContext=TASK_ASSIGNMENT&category=all&q=${encodeURIComponent(query.trim())}&sources=PERSON${excludeParam}`;
        const res = await fetchWithSceSelectorTimeout(url);
        const data = (await res.json()) as {
          groups?: Array<{ type: string; items: SceSelectorItem[] }>;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(sceSelectorDiscoverErrorForHttpStatus(res.status, data.error));
        }
        const items =
          data.groups?.flatMap((group) =>
            group.type === "PERSON" ? group.items : [],
          ) ?? [];
        const eligible = items.filter((item) => {
          const userId = linkedUserIdFromItem(item);
          return userId && !selectedRef.current.includes(userId);
        });
        setResults(eligible);
        setOpen(eligible.length > 0);
        setFocusedIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Suche fehlgeschlagen.");
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

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

  function addItem(item: SceSelectorItem) {
    const userId = linkedUserIdFromItem(item);
    if (!userId || selectedUserIds.includes(userId)) return;
    const next = [...selectedUserIds, userId];
    onSelectedUserIdsChange(next);
    onSelectionKnown?.([
      {
        userId,
        personId: item.id,
        label: item.label,
        description: item.description,
      },
    ]);
    setQuery("");
    setResults([]);
    setOpen(false);
    setFocusedIndex(0);
    inputRef.current?.focus();
  }

  function removeUserId(userId: string) {
    if (locked.has(userId)) return;
    onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
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
        if (open && results[focusedIndex]) addItem(results[focusedIndex]);
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
      {omitHiddenField || !fieldName ? null : (
        <input
          type="hidden"
          name={fieldName}
          form={form}
          value={selectedUserIds.join(",")}
          readOnly
        />
      )}
      <div ref={containerRef} className="relative w-full">
        {selectedUserIds.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5" data-testid={`${testIdPrefix}-chips`}>
            {selectedUserIds.map((userId) => {
              const known = knownByUserId?.get(userId);
              const chipLabel = known?.label ?? userId;
              return (
                <span
                  key={userId}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-2 pr-1 py-0.5 text-xs text-[var(--text-2)]"
                  data-testid={`${testIdPrefix}-chip-${userId}`}
                >
                  <span className="truncate">{chipLabel}</span>
                  {disabled || locked.has(userId) ? null : (
                    <button
                      type="button"
                      className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                      aria-label={`${chipLabel} entfernen`}
                      onClick={() => removeUserId(userId)}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        ) : null}

        {allowAdd ? (
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
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
                aria-label="Suche leeren"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}

        {!loading && query.length > 0 && query.length < SCE_SELECTOR_MIN_SEARCH_LENGTH ? (
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">Mindestens 2 Zeichen eingeben.</p>
        ) : null}
        {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}
        {!loading && !error && !open && query.trim().length >= SCE_SELECTOR_MIN_SEARCH_LENGTH && results.length === 0 ? (
          <p className="mt-1.5 text-xs italic text-[var(--muted)]">Keine Personen gefunden.</p>
        ) : null}

        {open && results.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]"
          >
            {results.map((item, index) => {
              const subtitle = item.description ?? null;
              const isFocused = index === focusedIndex;
              return (
                <li key={item.id} role="option" aria-selected={isFocused}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addItem(item);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors${
                      isFocused ? " bg-[var(--surface-2)]" : " hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <PersonAvatar name={item.label} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{item.label}</p>
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
