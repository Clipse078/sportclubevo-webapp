"use client";

import type { TournamentDto } from "@/lib/tournaments/types";
import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import { ClubIdentityDisplay } from "./ClubIdentityDisplay";
import { SportingActivityMetaRail } from "./SportingActivityMetaRail";
import { SportingActivityIdentity } from "./SportingActivityIdentity";
import { cn } from "@/lib/cn";

export type TournamentManagementIdentityProps = {
  tournament: TournamentDto;
  activityPresentation: SportingActivityPresentation;
  startTimeLabel: string;
  endTimeLabel?: string;
  className?: string;
};

export function TournamentManagementIdentity({
  tournament,
  activityPresentation,
  startTimeLabel,
  endTimeLabel,
  className,
}: TournamentManagementIdentityProps) {
  const organiser = buildTournamentOrganiserClubIdentity(tournament);

  return (
    <div className={cn("flex min-w-0 items-start gap-3", className)} data-testid="tournament-management-identity">
      <SportingActivityMetaRail
        activityKind="TOURNAMENT"
        typeLabel="TURNIER"
        startTimeLabel={startTimeLabel}
        endTimeLabel={endTimeLabel}
        density="management"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <ClubIdentityDisplay identity={organiser} density="management" truncate={false} />
        <p className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
          {activityPresentation.identity.title}
        </p>
        <SportingActivityIdentity
          presentation={activityPresentation}
          mode="management"
          showTypeLine={false}
          showPrimary={false}
          primaryWrap
        />
      </div>
    </div>
  );
}
