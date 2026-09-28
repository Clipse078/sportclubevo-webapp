"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  INBOX_QUICK_FILTERS,
  type InboxQuickFilterId,
} from "@/components/admin/communication/inbox/inbox-workspace-types";

type CommunicationInboxToolbarProps = {
  filter: InboxQuickFilterId;
  onFilterChange: (filter: InboxQuickFilterId) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
};

export function CommunicationInboxToolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onResetFilters,
  hasActiveFilters,
}: CommunicationInboxToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Konversationen durchsuchen</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-2)]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Konversationen durchsuchen …"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          />
        </label>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Filter zurücksetzen
          </button>
        ) : null}
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Konversationsfilter"
      >
        {INBOX_QUICK_FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                active
                  ? "border-[var(--sce-primary)]/50 bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]/60",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
