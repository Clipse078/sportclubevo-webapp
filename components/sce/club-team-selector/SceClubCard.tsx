"use client";

import { Check } from "lucide-react";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { cn } from "@/lib/cn";
import type { SceSelectableClub } from "@/lib/sce/club-team-selector/types";

export type SceClubCardProps = {
  club: SceSelectableClub;
  selected?: boolean;
  onSelect: (club: SceSelectableClub) => void;
  testId?: string;
};

export function SceClubCard({ club, selected = false, onSelect, testId }: SceClubCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(club)}
      data-testid={testId ?? `sce-club-card-${club.id}`}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-[7.5rem] flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition",
        "border-[var(--border)] bg-[var(--surface-2)]/30 hover:border-[var(--sce-primary)]/40 hover:bg-[var(--surface-2)]/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        selected && "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 ring-1 ring-[var(--sce-primary)]/30",
      )}
    >
      <div className="relative">
        <ClubLogo logoUrl={club.logoUrl} name={club.name} size="lg" bare decorative />
        {selected ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sce-primary)] text-white">
            <Check className="h-3 w-3" aria-hidden />
            <span className="sr-only">Ausgewählt</span>
          </span>
        ) : null}
      </div>
      <span className="line-clamp-2 w-full text-sm font-semibold leading-snug text-[var(--foreground)]">
        {club.name}
      </span>
      {club.shortName && club.shortName !== club.name ? (
        <span className="line-clamp-1 w-full text-xs text-[var(--text-2)]">{club.shortName}</span>
      ) : null}
    </button>
  );
}
