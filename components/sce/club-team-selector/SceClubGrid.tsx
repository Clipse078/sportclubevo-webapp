"use client";

import type { SceSelectableClub } from "@/lib/sce/club-team-selector/types";
import { SceClubCard } from "./SceClubCard";

/** Premium club browser density — ~4 columns at canonical form dialog width. */
export const SCE_CLUB_GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

export type SceClubGridProps = {
  clubs: readonly SceSelectableClub[];
  selectedClubId?: string | null;
  onSelectClub: (club: SceSelectableClub) => void;
  testId?: string;
};

export function SceClubGrid({
  clubs,
  selectedClubId,
  onSelectClub,
  testId = "sce-club-grid",
}: SceClubGridProps) {
  return (
    <ul
      className={SCE_CLUB_GRID_CLASS}
      data-testid={testId}
      role="listbox"
      aria-label="Vereine"
    >
      {clubs.map((club) => (
        <li key={club.id} role="presentation" className="min-w-0">
          <SceClubCard
            club={club}
            selected={selectedClubId === club.id}
            onSelect={onSelectClub}
          />
        </li>
      ))}
    </ul>
  );
}

function SceClubGridSkeleton() {
  return (
    <div
      className={SCE_CLUB_GRID_CLASS}
      data-testid="sce-club-grid-skeleton"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[10.5rem] animate-pulse flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/20 px-4 py-5"
        >
          <div className="h-[4.5rem] w-full max-w-[5.5rem] rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  );
}

SceClubGrid.Skeleton = SceClubGridSkeleton;
