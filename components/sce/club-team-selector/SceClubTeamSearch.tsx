"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export type SceClubTeamSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  className?: string;
};

export function SceClubTeamSearch({
  value,
  onChange,
  placeholder = "Verein oder Team suchen…",
  ariaLabel = "Suche",
  testId = "sce-club-team-selector-search",
  className,
}: SceClubTeamSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-2)]"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-testid={testId}
        className="fca-input w-full pl-9"
        autoComplete="off"
      />
    </div>
  );
}
