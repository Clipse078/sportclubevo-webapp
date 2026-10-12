"use client";

import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import type { TeamCockpitResult } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type Props = {
  result: TeamCockpitResult;
  formatConfig: TenantFormatConfig;
};

export default function TeamResultRow({ result, formatConfig }: Props) {
  return (
    <div
      className="min-w-0 px-3 py-3 sm:px-4 sm:py-3.5"
      data-testid={`team-result-${result.eventId}`}
      data-side={result.side}
      data-perspective={result.resultPerspective}
    >
      <SceMatchCard
        model={result.scePresentation}
        density="COMPACT"
        fmtCfg={formatConfig}
        linkToDetail
        testId={`team-result-sce-match-${result.eventId}`}
      />
    </div>
  );
}
