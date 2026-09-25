"use client";

import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import type { WeekplannerMatchSideIdentity } from "@/lib/weekplanner/types";

type Props = {
  home: WeekplannerMatchSideIdentity;
  away: WeekplannerMatchSideIdentity;
  testId?: string;
};

export function WeekplannerMatchIdentityCard({ home, away, testId = "weekplanner-match-identity" }: Props) {
  const homeName = home.displayName;
  const awayName = away.displayName;

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span data-testid="weekplanner-match-home-crest">
          <ClubLogo logoUrl={home.logoUrl} name={homeName} size="md" bare className="shrink-0" />
        </span>
        <span className="min-w-0 text-sm font-semibold text-[var(--foreground)]">{homeName}</span>
      </div>

      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] sm:px-2">vs.</span>

      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:justify-end">
        <span data-testid="weekplanner-match-away-crest">
          <ClubLogo logoUrl={away.logoUrl} name={awayName} size="md" bare className="shrink-0" />
        </span>
        <span className="min-w-0 text-sm font-semibold text-[var(--foreground)] sm:text-right">{awayName}</span>
      </div>
    </div>
  );
}
