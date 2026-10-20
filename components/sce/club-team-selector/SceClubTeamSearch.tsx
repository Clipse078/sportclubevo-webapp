"use client";

import { cn } from "@/lib/cn";
import { SceSearchField } from "@/components/sce/forms/SceSearchField";

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
  return (
    <SceSearchField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      testId={testId}
      clearable={clearable}
      shellClassName={cn("shrink-0", className)}
    />
  );
}
