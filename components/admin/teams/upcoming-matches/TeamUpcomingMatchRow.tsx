"use client";

import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import type { TeamCockpitMatch } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type Props = {
  match: TeamCockpitMatch;
  formatConfig: TenantFormatConfig;
};

export default function TeamUpcomingMatchRow({ match, formatConfig }: Props) {
  return (
    <div
      className="px-4 py-3"
      data-testid={`team-upcoming-match-${match.eventId}`}
      data-side={match.side}
      data-status={match.status}
      data-lifecycle={match.lifecycle}
    >
      <SceMatchCard
        model={match.scePresentation}
        density="STANDARD"
        fmtCfg={formatConfig}
        linkToDetail
        surface="standalone"
        testId={`team-upcoming-sce-match-${match.eventId}`}
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );
}
