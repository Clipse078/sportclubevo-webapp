"use client";

import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import type { TeamCockpitResult } from "@/lib/teams/team-cockpit-sporting-data";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

type Props = {
  result: TeamCockpitResult;
  formatConfig: TenantFormatConfig;
};

export default function TeamResultRow({ result, formatConfig }: Props) {
  return (
    <SceProgrammeActivityCardShell
      density="STANDARD"
      testId={`team-result-shell-${result.eventId}`}
      data-side={result.side}
      data-perspective={result.resultPerspective}
    >
      <div className="min-w-0 w-full" data-testid={`team-result-${result.eventId}`}>
        <SceMatchCard
          model={result.scePresentation}
          density="STANDARD"
          fmtCfg={formatConfig}
          linkToDetail
          surface="list-row"
          listRowPresentation="programme-fixture"
          className={LIST_ROW_CARD_CLASS}
          testId={`team-result-sce-match-${result.eventId}`}
        />
      </div>
    </SceProgrammeActivityCardShell>
  );
}
