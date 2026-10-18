"use client";

import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";

type Props = {
  sideA: TournamentPlanungFixtureSidePresentation;
  sideB: TournamentPlanungFixtureSidePresentation;
};

function sideIdentity(side: TournamentPlanungFixtureSidePresentation) {
  return buildClubIdentity({
    id: side.participantId ?? undefined,
    displayName: side.label,
    logoUrl: side.crestUrl,
    preferNeutralIcon: side.isPlaceholder,
  });
}

/** Dense crest + VS + crest row for Planung board cells (DnD-safe). */
export default function SceTournamentFixtureCompactMatchup({ sideA, sideB }: Props) {
  return (
    <div className="space-y-0.5" data-testid="sce-tournament-fixture-compact-matchup">
      <div className="flex min-w-0 items-center gap-1">
        <ClubCrest identity={sideIdentity(sideA)} density="micro" decorative className="shrink-0" />
        <span className="truncate font-medium text-[var(--foreground)]">{sideA.label}</span>
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]" aria-hidden>
        VS
      </p>
      <div className="flex min-w-0 items-center gap-1">
        <ClubCrest identity={sideIdentity(sideB)} density="micro" decorative className="shrink-0" />
        <span className="truncate text-[var(--muted)]">{sideB.label}</span>
      </div>
    </div>
  );
}
