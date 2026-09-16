"use client";

import { Search } from "lucide-react";

type CenterWorkspaceSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
  "data-testid"?: string;
};

/**
 * Compact search field shared by operational center workspaces.
 */
export function CenterWorkspaceSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  "data-testid": testId,
}: CenterWorkspaceSearchInputProps) {
  return (
    <div className={className ?? "relative min-w-[200px] flex-1"}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="fca-input fca-search-input h-8 w-full text-xs"
        aria-label={ariaLabel}
        data-testid={testId ?? "center-workspace-search"}
      />
    </div>
  );
}
