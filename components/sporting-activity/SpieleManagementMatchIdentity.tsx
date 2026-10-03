"use client";

import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import { formatSportingActivityCompactAgendaClubLocationLine } from "@/lib/sporting-activity-presentation/compact";
import { MatchClubPair } from "./MatchClubPair";
import { SportingActivityMetaRail } from "./SportingActivityMetaRail";
import { SportingActivityIdentity } from "./SportingActivityIdentity";
import { cn } from "@/lib/cn";

const MEIN_PROGRAMM_CONTRACT = { meinProgrammContract: true as const };

export type SpieleManagementMatchIdentityProps = {
  match: MatchcenterMatchSummary;
  activityPresentation: SportingActivityPresentation;
  tenantLogoUrl?: string | null;
  kickoffLabel: string;
  endTimeLabel?: string | null;
  competitionLabel?: string | null;
  className?: string;
};

export function SpieleManagementMatchIdentity({
  match,
  activityPresentation,
  tenantLogoUrl = null,
  kickoffLabel,
  endTimeLabel,
  competitionLabel,
  className,
}: SpieleManagementMatchIdentityProps) {
  const clubPair = buildMatchClubIdentityPair(match, tenantLogoUrl);
  const locationLine = formatSportingActivityCompactAgendaClubLocationLine(
    activityPresentation,
    MEIN_PROGRAMM_CONTRACT,
  );

  return (
    <div className={cn("min-w-0 space-y-2", className)} data-testid="spiele-management-match-identity">
      <div className="flex min-w-0 items-start gap-3">
        <SportingActivityMetaRail
          activityKind="MATCH"
          typeLabel="SPIEL"
          startTimeLabel={kickoffLabel}
          endTimeLabel={endTimeLabel ?? undefined}
          density="management"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <MatchClubPair pair={clubPair} density="management" />
          <SportingActivityIdentity
            presentation={activityPresentation}
            mode="management"
            showTypeLine={false}
            showPrimary={false}
            showClubLocationLine={false}
          />
          {competitionLabel ? (
            <p className="line-clamp-1 text-[0.6875rem] text-[var(--muted)]">{competitionLabel}</p>
          ) : null}
          {locationLine ? (
            <p className="line-clamp-2 text-[0.8125rem] text-[var(--text-2)]">{locationLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
