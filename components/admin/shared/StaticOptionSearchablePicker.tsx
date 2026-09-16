"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export type StaticOption = {
  value: string;
  label: string;
  /** Optional search keywords beyond label. */
  searchText?: string;
  disabled?: boolean;
};

type Props = {
  options: StaticOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
  testId?: string;
  /** Shown on the closed trigger when a value is selected. */
  ariaLabel?: string;
};

export default function StaticOptionSearchablePicker({
  options,
  value,
  onChange,
  placeholder = "Auswählen…",
  emptyLabel = "Keine Optionen verfügbar.",
  disabled = false,
  required = false,
  testId = "static-option-searchable-picker",
  ariaLabel,
}: Props) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.searchText ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const selectOption = useCallback(
    (option: StaticOption) => {
      if (option.disabled) return;
      onChange(option.value);
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
          aria-label={ariaLabel ?? placeholder}
          aria-required={required}
          value={open ? query : selected?.label ?? query}
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
          placeholder={selected && !open ? selected.label : placeholder}
          disabled={disabled || options.length === 0}
          className="fca-input fca-search-input fca-combobox-input h-9 w-full text-sm"
          data-testid={`${testId}-select`}
        />
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
      </div>

      {required ? (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          value={value}
          required
          onChange={() => {}}
          className="sr-only"
          data-testid={`${testId}-value`}
        />
      ) : null}

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
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs italic text-[var(--muted)]">Keine Treffer.</li>
          ) : (
            filtered.map((option, index) => {
              const isHighlighted = index === highlightIndex;
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                      isHighlighted ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
                      isSelected && "font-medium text-[var(--sce-primary)]",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                    data-testid={`${testId}-option-${option.value}`}
                  >
                    <span className="truncate text-[var(--foreground)]">{option.label}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
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
