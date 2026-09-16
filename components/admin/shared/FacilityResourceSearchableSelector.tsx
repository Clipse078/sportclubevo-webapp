"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { Building2, Loader2, MapPin, Plus, Search } from "lucide-react";
import type { FacilityResourceType } from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  formatAvailabilitySuffix,
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";

const RESOURCE_TYPE_LABELS: Record<FacilityResourceType, string> = {
  FULL_PITCH: "Ganzes Feld",
  HALF_PITCH: "Halbes Feld",
  DRESSING_ROOM: "Garderobe",
  OTHER: "Sonstiges",
};

type FlatResourceOption = {
  id: string;
  label: string;
  facilityName: string;
  groupLabel: string;
};

type Props = {
  facilityGroups: FacilityGroup[];
  allocatedResourceIds: Set<string>;
  onAdd: (resourceId: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  addButtonLabel?: string;
  noResourcesMessage?: string;
  allAllocatedMessage?: string;
  testId?: string;
  availabilityByResourceId?: Map<string, ResourceAvailabilityAnnotation>;
};

export function FacilityResourceSearchableSelector({
  facilityGroups,
  allocatedResourceIds,
  onAdd,
  disabled = false,
  placeholder = "auswählen…",
  addButtonLabel = "Zuweisen",
  noResourcesMessage = "Keine Ressourcen dieses Typs konfiguriert.",
  allAllocatedMessage = "Alle verfügbaren Ressourcen wurden bereits zugewiesen.",
  testId,
  availabilityByResourceId,
}: Props) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalResourceCount = facilityGroups.reduce((sum, fg) => sum + fg.resources.length, 0);
  const hasAvailable = facilityGroups.some((fg) =>
    fg.resources.some((r) => !allocatedResourceIds.has(r.id)),
  );

  const flatOptions = useMemo(() => {
    const items: FlatResourceOption[] = [];
    for (const fg of facilityGroups) {
      for (const r of fg.resources) {
        if (allocatedResourceIds.has(r.id)) continue;
        const typeLabel = RESOURCE_TYPE_LABELS[r.type] ?? r.type;
        const availability = formatAvailabilitySuffix(availabilityByResourceId?.get(r.id));
        items.push({
          id: r.id,
          label: `${r.name} (${typeLabel})${availability}`,
          facilityName: fg.facilityName,
          groupLabel: fg.facilityName,
        });
      }
    }
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.facilityName.toLowerCase().includes(q) ||
        o.groupLabel.toLowerCase().includes(q),
    );
  }, [facilityGroups, allocatedResourceIds, availabilityByResourceId, query]);

  const selectedOption = flatOptions.find((o) => o.id === selectedId) ?? null;

  const handleAdd = useCallback(() => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      try {
        await onAdd(selectedId);
        setSelectedId("");
        setQuery("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Hinzufügen");
      }
    });
  }, [selectedId, onAdd]);

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
    if (highlightIndex >= flatOptions.length) {
      setHighlightIndex(Math.max(0, flatOptions.length - 1));
    }
  }, [flatOptions.length, highlightIndex]);

  if (totalResourceCount === 0) {
    return (
      <p className="text-sm italic text-[var(--text-2)]" data-testid={testId ? `${testId}-no-resources` : undefined}>
        {noResourcesMessage}
      </p>
    );
  }

  if (!hasAvailable) {
    return (
      <p className="text-sm italic text-[var(--text-2)]" data-testid={testId ? `${testId}-all-allocated` : undefined}>
        {allAllocatedMessage}
      </p>
    );
  }

  const showListbox = open && !disabled;

  let lastGroup: string | null = null;

  return (
    <div ref={containerRef} className="space-y-2" data-testid={testId}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
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
            aria-label={placeholder}
            value={open ? query : selectedOption?.label ?? query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setHighlightIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setHighlightIndex((prev) => Math.min(prev + 1, Math.max(flatOptions.length - 1, 0)));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setHighlightIndex((prev) => Math.max(prev - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const option = flatOptions[highlightIndex];
                if (option) {
                  setSelectedId(option.id);
                  setOpen(false);
                  setQuery("");
                }
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            disabled={disabled || isPending}
            placeholder={placeholder}
            className="fca-input h-9 w-full pl-8 pr-3 text-sm"
            data-testid={testId ? `${testId}-select` : undefined}
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedId || disabled || isPending}
          data-testid={testId ? `${testId}-add-button` : undefined}
          className="fca-button-primary shrink-0"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {addButtonLabel}
        </button>
      </div>

      {showListbox ? (
        <ul
          id={listboxId}
          role="listbox"
          className="z-30 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          data-testid={testId ? `${testId}-listbox` : undefined}
        >
          {flatOptions.length === 0 ? (
            <li className="px-3 py-2 text-xs italic text-[var(--muted)]">Keine Treffer.</li>
          ) : (
            flatOptions.map((option, index) => {
              const showGroup = option.groupLabel !== lastGroup;
              lastGroup = option.groupLabel;
              const isHighlighted = index === highlightIndex;
              const isSelected = option.id === selectedId;
              return (
                <li key={option.id} role="presentation">
                  {showGroup ? (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {option.groupLabel}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => {
                      setSelectedId(option.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors",
                      isHighlighted ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
                      isSelected && "font-medium text-[var(--sce-primary)]",
                    )}
                    data-testid={testId ? `${testId}-option-${option.id}` : undefined}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--sce-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-[var(--muted)]">
        <Building2 size={12} className="mr-1 inline" aria-hidden />
        Ressourcen nach Anlage gruppiert.{" "}
        <MapPin size={12} className="mr-1 inline" aria-hidden />
        Archivierte Ressourcen werden nicht angezeigt.
      </p>
    </div>
  );
}
