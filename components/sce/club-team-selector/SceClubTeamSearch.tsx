"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SCE_CLUB_TEAM_SEARCH_INPUT_CLASS,
  SCE_CLUB_TEAM_SEARCH_INPUT_WITH_CLEAR_CLASS,
} from "@/lib/sce/club-team-selector/club-team-search-contract";

export type SceClubTeamSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  className?: string;
  /** When true, shows a trailing clear control when the field has text. */
  clearable?: boolean;
};

export function SceClubTeamSearch({
  value,
  onChange,
  placeholder = "Verein oder Team suchen…",
  ariaLabel = "Suche",
  testId = "sce-club-team-selector-search",
  className,
  clearable = true,
}: SceClubTeamSearchProps) {
  const showClear = clearable && value.trim().length > 0;

  return (
    <div className={cn("relative shrink-0", className)} data-testid={`${testId}-shell`}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-2)]"
        aria-hidden
        data-sce-search-leading-icon="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-testid={testId}
        className={cn(
          "w-full text-sm",
          showClear ? SCE_CLUB_TEAM_SEARCH_INPUT_WITH_CLEAR_CLASS : SCE_CLUB_TEAM_SEARCH_INPUT_CLASS,
        )}
        autoComplete="off"
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          aria-label="Suche löschen"
          data-testid={`${testId}-clear`}
          data-sce-search-trailing-clear="true"
          onClick={() => onChange("")}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
