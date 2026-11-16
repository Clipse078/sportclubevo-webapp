"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { SceCheckbox } from "@/components/sce/forms/SceCheckbox";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { SprintBoardFilterState } from "@/lib/club-development/sprints/sprint-board-filters";
import { EMPTY_BOARD_FILTERS } from "@/lib/club-development/sprints/sprint-board-filters";

type AssigneeOption = { id: string; label: string };
type InitiativeOption = { id: string; label: string };

type Props = {
  filters: SprintBoardFilterState;
  onFiltersChange: (next: SprintBoardFilterState) => void;
  secondaryFiltersOpen: boolean;
  onSecondaryFiltersToggle: () => void;
  assigneeOptions: AssigneeOption[];
  initiativeOptions: InitiativeOption[];
};

export default function SprintBoardWorkspaceToolbar({
  filters,
  onFiltersChange,
  secondaryFiltersOpen,
  onSecondaryFiltersToggle,
  assigneeOptions,
  initiativeOptions,
}: Props) {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.search.trim()) {
    chips.push({
      key: "search",
      label: `Suche: „${filters.search.trim()}“`,
      clear: () => onFiltersChange({ ...filters, search: "" }),
    });
  }
  if (filters.mineOnly) {
    chips.push({
      key: "mine",
      label: "Meine Aufgaben",
      clear: () => onFiltersChange({ ...filters, mineOnly: false }),
    });
  }
  if (filters.assigneeUserId) {
    const name = assigneeOptions.find((a) => a.id === filters.assigneeUserId)?.label ?? "Verantwortlich";
    chips.push({
      key: "assignee",
      label: name,
      clear: () => onFiltersChange({ ...filters, assigneeUserId: null }),
    });
  }
  if (filters.initiativeId) {
    const label =
      filters.initiativeId === "none"
        ? "Ohne Vorhaben"
        : (initiativeOptions.find((i) => i.id === filters.initiativeId)?.label ?? "Vorhaben");
    chips.push({
      key: "initiative",
      label,
      clear: () => onFiltersChange({ ...filters, initiativeId: null }),
    });
  }
  if (filters.groupByInitiative) {
    chips.push({
      key: "group",
      label: "Nach Vorhaben gruppiert",
      clear: () => onFiltersChange({ ...filters, groupByInitiative: false }),
    });
  }

  return (
    <div className="space-y-3" data-testid="sprint-board-toolbar">
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative block min-w-[min(100%,16rem)] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Aufgaben suchen …"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={onSecondaryFiltersToggle}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:border-[var(--sce-primary)]/40"
          aria-expanded={secondaryFiltersOpen}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          {secondaryFiltersOpen
            ? CD_VORHABEN_WORKSPACE_COPY.hideFiltersAction
            : CD_VORHABEN_WORKSPACE_COPY.moreFiltersAction}
          <ChevronDown
            className={`h-3.5 w-3.5 transition ${secondaryFiltersOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {secondaryFiltersOpen ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="inline-flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <SceCheckbox
              checked={filters.mineOnly}
              onChange={(e) => onFiltersChange({ ...filters, mineOnly: e.target.checked })}
            />
            Meine Aufgaben
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Verantwortlich</span>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              value={filters.assigneeUserId ?? ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, assigneeUserId: e.target.value || null })
              }
            >
              <option value="">Alle Verantwortlichen</option>
              {assigneeOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Vorhaben</span>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              value={filters.initiativeId ?? ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, initiativeId: e.target.value || null })
              }
            >
              <option value="">Alle Vorhaben</option>
              <option value="none">Ohne Vorhaben</option>
              {initiativeOptions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <SceCheckbox
              checked={filters.groupByInitiative}
              onChange={(e) =>
                onFiltersChange({ ...filters, groupByInitiative: e.target.checked })
              }
            />
            Nach Vorhaben gruppieren
          </label>
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:border-[var(--sce-primary)]/40"
              data-testid={`sprint-board-filter-chip-${chip.key}`}
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onFiltersChange(EMPTY_BOARD_FILTERS)}
            className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
          >
            Alle Filter zurücksetzen
          </button>
        </div>
      ) : null}
    </div>
  );
}