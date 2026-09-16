"use client";

import { Home, Plane } from "lucide-react";
import { cn } from "@/lib/cn";

export type TournamentHomeAway = "HOME" | "AWAY";

export const TOURNAMENT_HOME_AWAY_SEGMENTS: ReadonlyArray<{
  value: TournamentHomeAway;
  label: string;
}> = [
  { value: "HOME", label: "Heim (FC Allschwil ausrichtend)" },
  { value: "AWAY", label: "Auswärts (extern ausgerichtet)" },
];

type HomeAwaySegmentedControlProps = {
  value: TournamentHomeAway;
  onChange: (value: TournamentHomeAway) => void;
  disabled?: boolean;
  testId?: string;
  "aria-label"?: string;
};

export function HomeAwaySegmentedControl({
  value,
  onChange,
  disabled = false,
  testId = "tournament-home-away",
  "aria-label": ariaLabel = "Heim / Auswärts",
}: HomeAwaySegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      className="flex w-full max-w-3xl flex-col gap-1 sm:flex-row sm:items-stretch"
    >
      {TOURNAMENT_HOME_AWAY_SEGMENTS.map((segment) => {
        const isSelected = value === segment.value;
        const Icon = segment.value === "HOME" ? Home : Plane;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            data-testid={`${testId}-option-${segment.value.toLowerCase()}`}
            onClick={() => onChange(segment.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange("AWAY");
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                onChange("HOME");
              }
            }}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-[color-mix(in_srgb,var(--sce-accent)_45%,var(--border-strong))] bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--foreground)] shadow-sm"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isSelected ? "text-[var(--sce-accent)]" : "text-[var(--muted)]",
              )}
              aria-hidden
            />
            <span className="min-w-0 leading-snug">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
