"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import type { FacilityResourceType } from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { FacilityResourceIdentity } from "@/components/admin/shared/planning/FacilityResourceIdentity";

const RESOURCE_TYPE_LABELS: Record<FacilityResourceType, string> = {
  FULL_PITCH: "Ganzes Feld",
  HALF_PITCH: "Halbes Feld",
  DRESSING_ROOM: "Garderobe",
  OTHER: "Sonstiges",
};

type FlatResourceOption = {
  id: string;
  name: string;
  resourceType: FacilityResourceType;
  facilityType?: string;
  facilityName: string;
  groupLabel: string;
  typeLabel: string;
  availability?: ResourceAvailabilityAnnotation;
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
        items.push({
          id: r.id,
          name: r.name,
          resourceType: r.type,
          facilityType: r.facilityType ?? fg.facilityType,
          facilityName: fg.facilityName,
          groupLabel: fg.facilityName,
          availability: availabilityByResourceId?.get(r.id),
          typeLabel,
        });
      }
    }
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.typeLabel.toLowerCase().includes(q) ||
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

  const clampedHighlightIndex = Math.min(
    highlightIndex,
    Math.max(0, flatOptions.length - 1),
  );

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
      <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
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
            value={open ? query : selectedOption?.name ?? query}
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
                const option = flatOptions[clampedHighlightIndex];
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
            className="fca-input h-9 w-full max-w-xl pl-8 pr-3 text-sm"
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
          className="z-30 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] py-1 shadow-[var(--shadow-lg)]"
          data-testid={testId ? `${testId}-listbox` : undefined}
        >
          {flatOptions.length === 0 ? (
            <li className="px-3 py-2 text-xs italic text-[var(--muted)]">Keine Treffer.</li>
          ) : (
            flatOptions.map((option, index) => {
              const showGroup = option.groupLabel !== lastGroup;
              lastGroup = option.groupLabel;
              const isHighlighted = index === clampedHighlightIndex;
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
                      "flex w-full px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sce-primary)]",
                      isHighlighted ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]/80",
                      isSelected && "ring-1 ring-inset ring-[var(--sce-primary)]/40",
                    )}
                    data-testid={testId ? `${testId}-option-${option.id}` : undefined}
                  >
                    <FacilityResourceIdentity
                      name={option.name}
                      resourceType={option.resourceType}
                      facilityType={option.facilityType}
                      subtitle={option.typeLabel}
                      availability={option.availability?.status ?? null}
                      detail={option.availability?.conflictLabel ?? null}
                      compact
                      className="w-full"
                    />
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

    </div>
  );
}
