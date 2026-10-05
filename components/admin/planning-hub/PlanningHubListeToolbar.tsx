"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildPlanningHubHref, type PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { planningHubFiltersActive } from "@/lib/planning-hub/list-operational";

type PlanningHubListeToolbarProps = {
  urlState: PlanningHubUrlState;
  visibleCount: number;
  weekHasItems: boolean;
};

export default function PlanningHubListeToolbar({
  urlState,
  visibleCount,
  weekHasItems,
}: PlanningHubListeToolbarProps) {
  const [draftSearch, setDraftSearch] = useState(urlState.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraftSearch(urlState.search);
  }, [urlState.search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commitSearch(next: string) {
    const trimmed = next.trim();
    if (trimmed === urlState.search.trim()) return;
    window.location.href = buildPlanningHubHref(urlState, { search: trimmed });
  }

  function scheduleCommit(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(next), 320);
  }

  const filtersActive = planningHubFiltersActive(urlState);
  const resetHref = buildPlanningHubHref(urlState, {
    activity: "alle",
    team: null,
    facility: null,
    conflictsOnly: false,
    search: "",
  });

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      data-testid="planning-hub-liste-toolbar"
    >
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={draftSearch}
          onChange={(event) => {
            const value = event.target.value;
            setDraftSearch(value);
            scheduleCommit(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              commitSearch(draftSearch);
            }
          }}
          placeholder="Team, Gegner, Anlage, Ressource …"
          className="fca-input fca-search-input h-8 w-full text-xs"
          aria-label="Aktivitäten durchsuchen"
          data-testid="planning-hub-liste-search"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
        {weekHasItems ? (
          <span data-testid="planning-hub-liste-visible-count">
            {visibleCount} {visibleCount === 1 ? "Eintrag" : "Einträge"}
          </span>
        ) : null}
        {(filtersActive || urlState.search.trim()) && (
          <Link
            href={resetHref}
            className={cn(
              "rounded-full border border-[var(--border)] px-2.5 py-1 font-semibold transition",
              "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
            )}
            data-testid="planning-hub-liste-reset-filters"
          >
            Filter zurücksetzen
          </Link>
        )}
      </div>
    </div>
  );
}
