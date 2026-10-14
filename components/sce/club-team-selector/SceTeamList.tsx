"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SceSelectableTeam } from "@/lib/sce/club-team-selector/types";

function formatTeamMeta(team: SceSelectableTeam): string | null {
  const parts = [team.categoryLabel, team.ageGroup, team.genderGroup].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

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
    <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]" data-testid={testId}>
      {teams.map((team) => {
        const selected = selectedTeamId === team.id;
        const meta = formatTeamMeta(team);
        return (
          <li key={team.id}>
            <button
              type="button"
              onClick={() => onSelectTeam(team)}
              data-testid={`sce-team-row-${team.id}`}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)]/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]",
                selected && "bg-[var(--sce-primary)]/10",
              )}
              aria-pressed={selected}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                  {team.name}
                </span>
                {meta ? (
                  <span className="mt-0.5 block truncate text-xs text-[var(--text-2)]">{meta}</span>
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
