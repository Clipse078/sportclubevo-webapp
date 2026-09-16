"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";

export type TeamPickerOption = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
};

function formatTeamMeta(team: TeamPickerOption): string {
  return [team.ageGroup, team.genderGroup].filter(Boolean).join(" / ");
}

function formatSearchText(team: TeamPickerOption): string {
  return [team.name, team.ageGroup, team.genderGroup].filter(Boolean).join(" ");
}

type Props = {
  options: TeamPickerOption[];
  value: string;
  onChange: (teamId: string) => void;
  /** Tenant crest for FC Allschwil team rows. */
  tenantLogoUrl?: string | null;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  testId?: string;
};

export default function TeamSearchablePicker({
  options,
  value,
  onChange,
  tenantLogoUrl = null,
  placeholder = "FC Allschwil Team suchen…",
  emptyLabel = "Kein Team verfügbar.",
  disabled = false,
  testId = "team-searchable-picker",
}: Props) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => formatSearchText(o).toLowerCase().includes(q));
  }, [options, query]);

  const selectOption = useCallback(
    (option: TeamPickerOption) => {
      onChange(option.id);
      setQuery("");
      setOpen(false);
      setHighlightIndex(0);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (highlightIndex >= filtered.length) {
      setHighlightIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, highlightIndex]);

  const showListbox = open && !disabled;

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered[highlightIndex]) {
        selectOption(filtered[highlightIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-1" data-testid={testId}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showListbox}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={open ? query : selected?.name ?? query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlightIndex(0);
          }}
          onFocus={() => {
            setOpen(true);
            if (selected && !query) setQuery("");
          }}
          onClick={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled || options.length === 0}
          className="fca-input fca-search-input fca-combobox-input h-9 w-full text-sm"
          data-testid={`${testId}-select`}
        />
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
      </div>

      {options.length === 0 ? (
        <p className="text-xs italic text-[var(--muted)]">{emptyLabel}</p>
      ) : null}

      {showListbox ? (
        <ul
          id={listboxId}
          role="listbox"
          className="z-30 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          data-testid={`${testId}-listbox`}
        >
          <li className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            FC Allschwil Teams
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs italic text-[var(--muted)]">Keine Treffer.</li>
          ) : (
            filtered.map((option, index) => {
              const isHighlighted = index === highlightIndex;
              const isSelected = option.id === value;
              const meta = formatTeamMeta(option);
              return (
                <li key={option.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      isHighlighted ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
                    )}
                    data-testid={`${testId}-option-${option.id}`}
                  >
                    <ClubLogo logoUrl={tenantLogoUrl} name={option.name} size="sm" bare className="h-6 w-6 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[var(--foreground)]">{option.name}</span>
                      {meta ? (
                        <span className="block truncate text-xs text-[var(--text-2)]">{meta}</span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--sce-primary)]" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
