"use client";

import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import VorhabenPrioritaetenControl from "./VorhabenPrioritaetenControl";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  secondaryFiltersOpen: boolean;
  onSecondaryFiltersToggle: () => void;
  showPrioritaetenControl?: boolean;
  prioritaetenActive?: boolean;
  searchPlaceholder?: string;
  embedded?: boolean;
};

export default function VorhabenWorkspaceToolbar({
  search,
  onSearchChange,
  secondaryFiltersOpen,
  onSecondaryFiltersToggle,
  showPrioritaetenControl = false,
  prioritaetenActive = false,
  searchPlaceholder = CD_VORHABEN_WORKSPACE_COPY.searchPlaceholder,
  embedded = false,
}: Props) {
  return (
    <div className={embedded ? "min-w-0 flex-1 space-y-3" : "mb-4 space-y-3"}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative block min-w-[min(100%,16rem)] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
          />
        </label>
        {showPrioritaetenControl ? (
          <VorhabenPrioritaetenControl prioritaetenActive={prioritaetenActive} inline />
        ) : null}
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
    </div>
  );
}