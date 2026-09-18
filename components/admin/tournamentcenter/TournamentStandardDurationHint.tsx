"use client";

import Link from "next/link";
import {
  FACILITIES_ZEITSTANDARDS_HREF,
  formatConfiguredTournamentDurationLabel,
} from "@/lib/tournaments/tournament-schedule-presentation";

type Props = {
  defaultTournamentDurationMinutes: number;
  canManageFacilitiesTimeStandards: boolean;
  testId?: string;
};

export default function TournamentStandardDurationHint({
  defaultTournamentDurationMinutes,
  canManageFacilitiesTimeStandards,
  testId = "tournament-standard-duration",
}: Props) {
  return (
    <p className="text-xs text-[var(--muted)]" data-testid={testId}>
      Standarddauer: {formatConfiguredTournamentDurationLabel(defaultTournamentDurationMinutes)}
      {canManageFacilitiesTimeStandards ? (
        <>
          {" · "}
          <Link
            href={FACILITIES_ZEITSTANDARDS_HREF}
            className="font-medium text-[var(--blue)] underline-offset-2 hover:underline"
            data-testid={`${testId}-manage-link`}
          >
            Zeitstandard verwalten
          </Link>
        </>
      ) : null}
    </p>
  );
}
