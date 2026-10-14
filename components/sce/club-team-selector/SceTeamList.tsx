"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatSelectableTeamMetadata } from "@/lib/sce/club-team-selector/format-selectable-team-metadata";
import type { SceSelectableTeam } from "@/lib/sce/club-team-selector/types";

export type SceTeamListProps = {
  teams: readonly SceSelectableTeam[];
  selectedTeamId?: string | null;
  onSelectTeam: (team: SceSelectableTeam) => void;
  testId?: string;
};

export function SceTeamList({
  teams,
  selectedTeamId,
  onSelectTeam,
  testId = "sce-team-list",
}: SceTeamListProps) {
  return (
    <ul className="flex flex-col gap-2" data-testid={testId} role="listbox" aria-label="Teams">
      {teams.map((team) => {
        const selected = selectedTeamId === team.id;
        const meta = formatSelectableTeamMetadata(team);
        return (
          <li key={team.id}>
            <button
              type="button"
              onClick={() => onSelectTeam(team)}
              data-testid={`sce-team-row-${team.id}`}
              data-sce-team-meta={meta ?? undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3.5 text-left transition",
                "bg-[var(--surface-2)]/20 hover:border-[var(--sce-primary)]/35 hover:bg-[var(--surface-2)]/55",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                selected && "border-[var(--sce-primary)]/60 bg-[var(--sce-primary)]/10",
              )}
              aria-pressed={selected}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-[var(--foreground)]">
                  {team.name}
                </span>
                {meta ? (
                  <span className="mt-1 block text-xs text-[var(--text-2)]">{meta}</span>
                ) : null}
              </span>
              {selected ? <Check className="h-4 w-4 shrink-0 text-[var(--sce-primary)]" aria-hidden /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
