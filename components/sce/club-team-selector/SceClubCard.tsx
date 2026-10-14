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

/** Fixed crest bounding box — logos stay object-contain inside, never cropped. */
const CREST_BOX_CLASS = "flex h-[4.5rem] w-full max-w-[5.5rem] items-center justify-center";

export function SceClubCard({ club, selected = false, onSelect, testId }: SceClubCardProps) {
  const secondary =
    club.shortName && club.shortName !== club.name
      ? club.shortName
      : club.alternativeName && club.alternativeName !== club.name
        ? club.alternativeName
        : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(club)}
      data-testid={testId ?? `sce-club-card-${club.id}`}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-[10.5rem] w-full flex-col items-center gap-3 rounded-2xl border px-4 py-5 text-center transition",
        "border-[var(--border)] bg-[var(--surface-2)]/25 hover:border-[var(--sce-primary)]/45 hover:bg-[var(--surface-2)]/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        selected && "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 ring-1 ring-[var(--sce-primary)]/30",
      )}
    >
      <div className={cn("relative", CREST_BOX_CLASS)} data-sce-club-crest-box="true">
        <ClubLogo logoUrl={club.logoUrl} name={club.name} size="xl" bare decorative />
        {selected ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sce-primary)] text-white">
            <Check className="h-3 w-3" aria-hidden />
            <span className="sr-only">Ausgewählt</span>
          </span>
        ) : null}
      </div>
      <span
        className="line-clamp-2 w-full break-words text-sm font-semibold leading-snug text-[var(--foreground)]"
        data-sce-club-name="true"
      >
        {club.name}
      </span>
      {secondary ? (
        <span className="line-clamp-1 w-full text-xs text-[var(--text-2)]">{secondary}</span>
      ) : null}
    </button>
  );
}
