"use client";

import type { SceSelectableClub } from "@/lib/sce/club-team-selector/types";
import { SceClubCard } from "./SceClubCard";

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
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      data-testid={testId}
      role="listbox"
      aria-label="Vereine"
    >
      {clubs.map((club) => (
        <li key={club.id} role="presentation">
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
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      data-testid="sce-club-grid-skeleton"
      aria-hidden
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[7.5rem] animate-pulse flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/20 px-3 py-4"
        >
          <div className="h-16 w-16 rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-20 rounded bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  );
}

SceClubGrid.Skeleton = SceClubGridSkeleton;
