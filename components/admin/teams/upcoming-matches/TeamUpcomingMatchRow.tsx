"use client";

import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import type { TeamCockpitMatch } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

type Props = {
  match: TeamCockpitMatch;
  formatConfig: TenantFormatConfig;
};

export default function TeamUpcomingMatchRow({ match, formatConfig }: Props) {
  return (
    <SceProgrammeActivityCardShell
      density="STANDARD"
      testId={`team-upcoming-match-shell-${match.eventId}`}
      data-side={match.side}
      data-status={match.status}
      data-lifecycle={match.lifecycle}
    >
      <div
        className="min-w-0 w-full"
        data-testid={`team-upcoming-match-${match.eventId}`}
      >
        <SceMatchCard
          model={match.scePresentation}
          density="STANDARD"
          fmtCfg={formatConfig}
          linkToDetail
          surface="list-row"
          listRowPresentation="programme-fixture"
          className={LIST_ROW_CARD_CLASS}
          testId={`team-upcoming-sce-match-${match.eventId}`}
        />
      </div>
    </SceProgrammeActivityCardShell>
  );
}
